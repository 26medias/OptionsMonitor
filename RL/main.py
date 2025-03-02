import os
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv
from MarketEnv import MarketEnv

def train_on_market_data(data_dir, total_timesteps=10000):
    # Initialize the Gymnasium environment.
    env = MarketEnv(data_dir=data_dir)
    env = Monitor(env)
    env = DummyVecEnv([lambda: env])
    
    # For an MLP-based policy, PPO is better run on the CPU.
    device = "cpu"
    print(f"Using {device} device")
    
    model = PPO("MlpPolicy", env, verbose=1, device=device)
    
    # Begin training.
    model.learn(total_timesteps=total_timesteps)
    model.save("ppo_market_model-2")
    print("Training complete. Model saved.")

if __name__ == "__main__":
    data_directory = "data"  # Path to your directory with JSON files.
    train_on_market_data(data_directory, total_timesteps=100000)
