import os
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv
from MarketEnv import MarketEnv

def test_model(data_dir, model_path="ppo_market_model.zip", episodes=10):
    env = MarketEnv(data_dir=data_dir, split="test")
    env = Monitor(env)
    env = DummyVecEnv([lambda: env])
    model = PPO.load(model_path, env=env)
    
    rewards = []
    for ep in range(episodes):
        obs, info = env.reset()
        done = False
        total_reward = 0.0
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward[0]  # reward is a vector from DummyVecEnv
            done = terminated or truncated
        rewards.append(total_reward)
        print(f"Episode {ep+1}: Total Reward = {total_reward}")
    avg_reward = np.mean(rewards)
    print(f"Average Reward over {episodes} episodes: {avg_reward}")

if __name__ == "__main__":
    data_directory = "data"
    test_model(data_directory, model_path="ppo_market_model.zip", episodes=10)
