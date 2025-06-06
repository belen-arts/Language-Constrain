import kagglehub
import shutil
import os

def download_emoji_dataset():
    """Download emoji dataset using standard kagglehub syntax"""
    
    print("Using kagglehub version:", kagglehub.__version__)
    
    # Download dataset - simple syntax that works across versions
    print("Downloading emoji dataset...")
    cache_path = kagglehub.dataset_download("subinium/emojiimage-dataset")
    
    print("Downloaded to cache:", cache_path)
    
    # Create local data directory in your project
    project_data_dir = "./data/emoji_dataset"
    os.makedirs(project_data_dir, exist_ok=True)
    
    # Copy files from cache to your project
    print(f"Copying files to {project_data_dir}...")
    
    if os.path.exists(cache_path):
        for file in os.listdir(cache_path):
            src = os.path.join(cache_path, file)
            dst = os.path.join(project_data_dir, file)
            
            if os.path.isfile(src):  # Only copy files, not directories
                shutil.copy2(src, dst)
                print(f"Copied: {file}")
            elif os.path.isdir(src):  # Copy directories recursively
                if os.path.exists(dst):
                    shutil.rmtree(dst)
                shutil.copytree(src, dst)
                print(f"Copied directory: {file}")
    
    print("Dataset now available locally in ./data/emoji_dataset/")
    
    # List what we got
    if os.path.exists(project_data_dir):
        local_files = os.listdir(project_data_dir)
        print("Available files:", local_files)
        
        # Show file sizes for reference
        for file in local_files:
            file_path = os.path.join(project_data_dir, file)
            if os.path.isfile(file_path):
                size = os.path.getsize(file_path)
                print(f"  {file}: {size:,} bytes")
    
    return project_data_dir

if __name__ == "__main__":
    try:
        dataset_path = download_emoji_dataset()
        print("Success! Dataset downloaded to:", dataset_path)
    except Exception as e:
        print(f"Error downloading dataset: {e}")
        print("Make sure you're logged into Kaggle: kaggle auth")