import os
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv
from MarketEnv import MarketEnv

def train_model(data_dir, total_timesteps=50000, log_dir="logs"):
    os.makedirs(log_dir, exist_ok=True)
    step_log_file = os.path.join(log_dir, "step_actions_train.csv")

    # Create the environment
    env = MarketEnv(
        data_dir=data_dir,
        split="train",
        log_file=step_log_file,
        illegal_action_penalty=-5.0,
        shaping_scale=0.01
    )
    env = Monitor(env, filename=os.path.join(log_dir, "train_monitor.csv"))
    env = DummyVecEnv([lambda: env])
    
    # Force CPU usage
    device = "cpu"
    print(f"Using {device} device for training")
    
    model = PPO("MlpPolicy", env, verbose=1, device=device)
    model.learn(total_timesteps=total_timesteps)
    model.save("ppo_market_model")
    print("Training complete. Model saved.")

if __name__ == "__main__":
    data_directory = "data"
    train_model(data_directory, total_timesteps=500000)
