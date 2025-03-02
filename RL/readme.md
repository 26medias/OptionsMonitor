Below is a sample `README.md` that covers installation, training, testing, and an overview of the project structure.

---

```markdown
# Financial RL Trading Game

This project is an RL-based trading game simulator. The environment uses sequential financial data from JSON files (e.g., AAPL.json, AMD.json) that are split into training and testing sets. The first 60% of each dataset is used for training, and the last 40% is used for validation/testing. The agent learns to decide among four actions:
- **BUY:** Bet that the price will increase.
- **SHORT:** Bet that the price will decrease.
- **CLOSE:** Close an open position.
- **NONE:** Do nothing.

The project includes logging and charting utilities to help you track training progress and evaluate performance.

## Project Structure

```
project/
 ├── data/              # JSON files with financial data.
 ├── MarketEnv.py       # Custom Gymnasium environment.
 ├── train.py           # Training script for the RL agent.
 ├── test.py            # Testing script to evaluate a saved model.
 └── utils.py           # Utility module for logging and plotting.
```

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/financial-rl-trading-game.git
   cd financial-rl-trading-game
   ```

2. **Set Up a Virtual Environment:**

   It is recommended to use a virtual environment. For example, using `conda`:

   ```bash
   conda create --name trading-env python=3.10
   conda activate trading-env
   ```

   Or with `virtualenv`:

   ```bash
   python -m venv trading-env
   source trading-env/bin/activate  # On Windows, use trading-env\Scripts\activate
   ```

3. **Install Dependencies:**

   Install the required Python packages via pip:

   ```bash
   pip install -r requirements.txt
   ```

   If you don’t have a `requirements.txt` file, here are some required packages:
   - `gymnasium`
   - `stable-baselines3`
   - `numpy`
   - `pandas`
   - `matplotlib`

   You can install them via:

   ```bash
   pip install gymnasium stable-baselines3 numpy pandas matplotlib
   ```

## Training

To train your RL agent on the training split of your datasets, run the following command:

```bash
python train.py
```

- **Logs & Monitoring:**  
  The training script wraps the environment with a Monitor. Episode rewards and other metrics are logged to `logs/train_monitor.csv`.  
- **Plotting:**  
  After training, a plot of episode rewards is generated using the utility function in `utils.py`.
- **Model Saving:**  
  Once training is complete, the PPO model is saved as `ppo_market_model.zip`.

## Testing

To evaluate the performance of a trained model on the test split of the datasets, run:

```bash
python test.py
```

- The testing script loads `ppo_market_model.zip` and runs the agent for a specified number of episodes (default: 10).  
- It prints the total reward for each episode and the average reward over all episodes.

## Customization

- **Data Splitting:**  
  The environment (`MarketEnv.py`) automatically splits each dataset:
  - First 60% of data is used for training.
  - Last 40% is used for testing.
  
- **Logging & Charting:**  
  You can modify `utils.py` to change how training metrics are logged and visualized.
  
- **Algorithm & Hyperparameters:**  
  Training hyperparameters and device settings can be adjusted in `train.py`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```

---

Feel free to adjust the wording and structure to fit your project specifics. This README should give users clear instructions on installation, training, testing, and an overview of the project.