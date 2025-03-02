import os
import json
import random
import numpy as np
import gymnasium as gym
from gymnasium import spaces

ACTION_NAMES = {
    0: "BUY",
    1: "SHORT",
    2: "CLOSE",
    3: "NONE"
}

class MarketEnv(gym.Env):
    metadata = {"render.modes": ["human"]}

    def __init__(
        self,
        data_dir,
        split="train",
        log_file=None,
        illegal_action_penalty=-5.0,
        shaping_scale=0.01
    ):
        """
        :param data_dir: Path to directory containing JSON datasets.
        :param split: "train" for first 60% of each dataset, "test" for last 40%.
        :param log_file: If not None, path to a CSV file to log each step (incl. reward).
        :param illegal_action_penalty: Negative reward for illegal actions (e.g. opening a new position while one is open).
        :param shaping_scale: Scale factor for partial unrealized PnL shaping. 
                              E.g., 0.01 means each step you get 1% of your unrealized PnL as reward.
        """
        super(MarketEnv, self).__init__()
        self.split = split
        self.log_file = log_file
        self.illegal_action_penalty = illegal_action_penalty
        self.shaping_scale = shaping_scale

        self.datasets = self._load_datasets(data_dir)

        # Define action space
        # 0 -> BUY, 1 -> SHORT, 2 -> CLOSE, 3 -> NONE
        self.action_space = spaces.Discrete(4)

        # Define observation space (example shape)
        obs_dim = 2 + (10 * 6) + 4
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(obs_dim,), dtype=np.float32)

        # Internal tracking
        self.current_dataset = None
        self.current_dataset_name = None
        self.current_tick = 0
        self.num_ticks = 0
        self.position = {
            "is_open": False,
            "type": None,
            "cost": 0.0,
            "age": 0,
            "gains_percents": 0.0
        }

        # If logging is enabled, write a CSV header (if file doesn't exist)
        if self.log_file is not None and not os.path.exists(self.log_file):
            with open(self.log_file, "w") as f:
                f.write("dataset_name,timestamp,action,position_type,position_cost,position_age,position_gains,reward\n")

    def _load_datasets(self, data_dir):
        """
        Returns a list of (filename, data_list).
        Each data_list is the parsed JSON from that file.
        """
        datasets = []
        for filename in os.listdir(data_dir):
            if filename.endswith(".json"):
                path = os.path.join(data_dir, filename)
                with open(path, "r") as f:
                    data = json.load(f)
                if data:
                    datasets.append((filename, data))
        return datasets

    def reset(self, seed=None, options=None):
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)

        # Randomly select a dataset
        (self.current_dataset_name, original_dataset) = random.choice(self.datasets)
        n = len(original_dataset)
        split_index = int(0.6 * n)

        if self.split == "train":
            self.current_dataset = original_dataset[:split_index]
        else:
            self.current_dataset = original_dataset[split_index:]

        self.current_tick = 0
        self.num_ticks = len(self.current_dataset)
        self.position = {
            "is_open": False,
            "type": None,
            "cost": 0.0,
            "age": 0,
            "gains_percents": 0.0
        }

        observation = self._get_observation()
        info = {}
        return observation, info

    def step(self, action):
        reward = 0.0

        # Check if action is legal
        if action == 0:  # BUY
            if self.position["is_open"]:
                # Already have a position => illegal
                reward += self.illegal_action_penalty
            else:
                self._open_position("long")

        elif action == 1:  # SHORT
            if self.position["is_open"]:
                # Already have a position => illegal
                reward += self.illegal_action_penalty
            else:
                self._open_position("short")

        elif action == 2:  # CLOSE
            if self.position["is_open"]:
                # Closing valid
                reward += self._close_position()
            else:
                # No position => illegal
                reward += self.illegal_action_penalty

        elif action == 3:  # NONE
            pass

        # If there's an open position, give partial unrealized PnL as shaping reward
        if self.position["is_open"]:
            # Update gains
            step_shaping = self._update_position_gains()
            # Add partial unrealized gains to reward
            reward += step_shaping * self.shaping_scale

        # Log the step
        self._log_action(action, reward)

        self.current_tick += 1

        terminated = False
        truncated = False
        if self.current_tick >= self.num_ticks:
            terminated = True
            # If we still have an open position, close it at the end
            if self.position["is_open"]:
                reward += self._close_position()

        # Return next observation
        observation = None if terminated else self._get_observation()
        info = {}
        return observation, reward, terminated, truncated, info

    def _open_position(self, pos_type):
        current_close = self._current_tick_data()["close"]
        self.position["is_open"] = True
        self.position["type"] = pos_type
        self.position["cost"] = current_close
        self.position["age"] = 0
        self.position["gains_percents"] = 0.0

    def _close_position(self):
        tick_data = self._current_tick_data()
        current_close = tick_data["close"]
        cost = self.position["cost"]
        if self.position["type"] == "long":
            gains = ((current_close - cost) / cost) * 100
        else:
            gains = ((cost - current_close) / cost) * 100

        reward = gains
        self.position = {
            "is_open": False,
            "type": None,
            "cost": 0.0,
            "age": 0,
            "gains_percents": 0.0
        }
        return reward

    def _update_position_gains(self):
        """
        Update self.position["gains_percents"] and return the new gains (for shaping).
        """
        tick_data = self._current_tick_data()
        current_close = tick_data["close"]
        cost = self.position["cost"]
        self.position["age"] += 1

        if self.position["type"] == "long":
            gains = ((current_close - cost) / cost) * 100
        else:  # short
            gains = ((cost - current_close) / cost) * 100

        self.position["gains_percents"] = gains
        return gains

    def _get_observation(self):
        tick_data = self._current_tick_data()

        def safe_values(arr, missing_value=-1.0):
            return [missing_value if x is None else x for x in arr]

        close_val = tick_data["close"]
        volume_val = tick_data["volume"]

        marketcycle_day = safe_values(tick_data.get("marketcycle_day", [-1.0]*10))
        marketcycle_week = safe_values(tick_data.get("marketcycle_week", [-1.0]*10))
        marketcycle_month = safe_values(tick_data.get("marketcycle_month", [-1.0]*10))
        rsi_day = safe_values(tick_data.get("rsi_day", [-1.0]*10))
        rsi_week = safe_values(tick_data.get("rsi_week", [-1.0]*10))
        rsi_month = safe_values(tick_data.get("rsi_month", [-1.0]*10))

        pos_type_encoded = 0.0
        if self.position["is_open"]:
            pos_type_encoded = 1.0 if self.position["type"] == "long" else -1.0
        pos_cost = self.position["cost"]
        pos_age = self.position["age"]
        pos_gains = self.position["gains_percents"]

        observation = np.array(
            [close_val, volume_val] +
            marketcycle_day +
            marketcycle_week +
            marketcycle_month +
            rsi_day +
            rsi_week +
            rsi_month +
            [pos_type_encoded, pos_cost, pos_age, pos_gains],
            dtype=np.float32
        )
        return observation

    def _current_tick_data(self):
        if self.current_tick < self.num_ticks:
            return self.current_dataset[self.current_tick]
        else:
            return self.current_dataset[-1]

    def _log_action(self, action, reward):
        """
        Append a line to the CSV log file with:
        - dataset name
        - timestamp
        - action
        - position type
        - position cost
        - position age
        - position gains
        - reward
        """
        if self.log_file is None:
            return

        tick_data = self._current_tick_data()
        timestamp = tick_data.get("timestamp", "unknown")
        action_str = ACTION_NAMES[action]
        pos_type = self.position["type"] if self.position["is_open"] else "None"
        pos_cost = self.position["cost"]
        pos_age = self.position["age"]
        pos_gains = self.position["gains_percents"]

        with open(self.log_file, "a") as f:
            row = (
                f"{self.current_dataset_name},"
                f"{timestamp},"
                f"{action_str},"
                f"{pos_type},"
                f"{pos_cost},"
                f"{pos_age},"
                f"{pos_gains},"
                f"{reward}\n"
            )
            f.write(row)

    def render(self, mode="human"):
        print(f"Tick: {self.current_tick}, Position: {self.position}")
