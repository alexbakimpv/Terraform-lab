# Quick Setup with PAT

## Option 1: Using Script with Environment Variable (Recommended)

```bash
# Set your PAT as environment variable
export GITHUB_PAT=your_pat_token_here

# Run the setup script
./setup-submodules-with-pat.sh
```

## Option 2: Interactive (Will Prompt for PAT)

```bash
./add-submodules-manual.sh
```

When prompted:
- **Username**: `alexbakimpv`
- **Password**: Paste your PAT (not your GitHub password)

## Option 3: Direct Command

```bash
# Add submodules directly (will prompt for credentials)
git submodule add https://github.com/alexbakimpv/amplifychat-1eee5cdc.git services/amplify-air
git submodule add https://github.com/alexbakimpv/appsec-unilab-manager.git services/manager
git submodule update --init --recursive
```

When prompted:
- **Username**: `alexbakimpv`  
- **Password**: Your PAT token

## Option 4: Using PAT in URL (One-time)

```bash
# Replace YOUR_PAT with your actual token
git submodule add https://alexbakimpv:YOUR_PAT@github.com/alexbakimpv/amplifychat-1eee5cdc.git services/amplify-air
git submodule add https://alexbakimpv:YOUR_PAT@github.com/alexbakimpv/appsec-unilab-manager.git services/manager

# Then clean up the URLs in .gitmodules (remove PAT from file)
sed -i '' 's|https://alexbakimpv:[^@]*@github.com/|https://github.com/|g' .gitmodules

# Initialize
git submodule update --init --recursive
```

## After Setup

Your PAT will be stored in macOS Keychain automatically, so you won't need to enter it again for future operations.
