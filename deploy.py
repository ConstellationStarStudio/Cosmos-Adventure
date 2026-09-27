import os
import shutil
import sys

# SYSTEM UPDATE SCRIPT EHEHEHHEE

# Get the absolute path of the directory where the script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Source Project Paths
PROJECT_BP_PATH = os.path.join(SCRIPT_DIR, 'BP')
PROJECT_RP_PATH = os.path.join(SCRIPT_DIR, 'RP')

# Minecraft Game Data Path (com.mojang)
# This uses the %APPDATA% environment variable to be more robust (2026 path)
APPDATA = os.getenv('APPDATA')
COM_MOJANG_PATH = os.path.join(APPDATA, 'Minecraft Bedrock', 'Users', 'Shared', 'games', 'com.mojang')

# Target Deployment Paths
TARGET_BP_DIR = os.path.join(COM_MOJANG_PATH, 'development_behavior_packs')
TARGET_RP_DIR = os.path.join(COM_MOJANG_PATH, 'development_resource_packs')

# The final names for the deployed folders
PROJECT_NAME = os.path.basename(SCRIPT_DIR)
DEPLOY_BP_NAME = f'{PROJECT_NAME}-BP'
DEPLOY_RP_NAME = f'{PROJECT_NAME}-RP'

# --- DEPLOYMENT LOGIC ---

def deploy():
    """Deletes old packs and copies new ones into the com.mojang folder."""
    print("--- Starting Cosmos-Adventure Deployment Script ---")

    # 1. Validate that the com.mojang folder exists
    if not os.path.isdir(COM_MOJANG_PATH):
        print(f"\nERROR: Minecraft directory not found at:\n{COM_MOJANG_PATH}")
        print("Please ensure Minecraft Bedrock Edition is installed and has been run at least once.")
        sys.exit(1) # Exit with an error code
    
    print(f"Found Minecraft folder: {COM_MOJANG_PATH}")

    # 2. Ensure development pack folders exist
    os.makedirs(TARGET_BP_DIR, exist_ok=True)
    os.makedirs(TARGET_RP_DIR, exist_ok=True)

    # 3. Define full paths for the deployed packs
    target_bp_path = os.path.join(TARGET_BP_DIR, DEPLOY_BP_NAME)
    target_rp_path = os.path.join(TARGET_RP_DIR, DEPLOY_RP_NAME)

    # 4. Delete existing Behavior Pack, if it exists
    try:
        if os.path.isdir(target_bp_path):
            print(f"Deleting old Behavior Pack at: {target_bp_path}")
            shutil.rmtree(target_bp_path)
    except OSError as e:
        print(f"ERROR deleting folder {target_bp_path}: {e}")
        sys.exit(1)

    # 5. Delete existing Resource Pack, if it exists
    try:
        if os.path.isdir(target_rp_path):
            print(f"Deleting old Resource Pack at: {target_rp_path}")
            shutil.rmtree(target_rp_path)
    except OSError as e:
        print(f"ERROR deleting folder {target_rp_path}: {e}")
        sys.exit(1)

    # 6. Copy new Behavior Pack
    try:
        print(f"Copying new Behavior Pack from: {PROJECT_BP_PATH}")
        shutil.copytree(PROJECT_BP_PATH, target_bp_path)
        print("-> Behavior Pack deployed successfully.")
    except FileNotFoundError:
        print(f"ERROR: Source Behavior Pack not found at {PROJECT_BP_PATH}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR copying Behavior Pack: {e}")
        sys.exit(1)

    # 7. Copy new Resource Pack
    try:
        print(f"Copying new Resource Pack from: {PROJECT_RP_PATH}")
        shutil.copytree(PROJECT_RP_PATH, target_rp_path)
        print("-> Resource Pack deployed successfully.")
    except FileNotFoundError:
        print(f"ERROR: Source Resource Pack not found at {PROJECT_RP_PATH}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR copying Resource Pack: {e}")
        sys.exit(1)

    print("\n--- Deployment Complete! ---")
    print("You can now launch Minecraft.")

if __name__ == "__main__":
    deploy()