# Manual Submodule Setup for Private Repositories

The repositories appear to be private. Here are several ways to add them:

## Option 1: Use Personal Access Token (PAT)

1. **Generate a PAT**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `repo` (Full control of private repositories)
   - Copy the token

2. **Add submodules with PAT**:
   ```bash
   # When prompted:
   # Username: your-github-username
   # Password: paste-your-PAT-here (NOT your GitHub password)
   
   git submodule add https://github.com/alexbakimpv/amplifychat-1eee5cdc.git services/amplify-air
   git submodule add https://github.com/alexbakimpv/appsec-unilab-manager.git services/manager
   git submodule update --init --recursive
   ```

## Option 2: Use SSH (If you have SSH key for alexbakimpv account)

1. **Add SSH key to GitHub** (if not already done):
   - Copy your public key: `cat ~/.ssh/id_rsa.pub` (or your key file)
   - Add it to: https://github.com/settings/keys

2. **Add submodules with SSH**:
   ```bash
   git submodule add git@github.com:alexbakimpv/amplifychat-1eee5cdc.git services/amplify-air
   git submodule add git@github.com:alexbakimpv/appsec-unilab-manager.git services/manager
   git submodule update --init --recursive
   ```

## Option 3: Use Local Clones (If repositories are already cloned)

If you already have these repositories cloned locally:

```bash
# Find where they are
find ~ -maxdepth 3 -type d -name "*amplifychat*" -o -name "*appsec-unilab*" 2>/dev/null

# Then add from local path
git submodule add /path/to/amplifychat-1eee5cdc services/amplify-air
git submodule add /path/to/appsec-unilab-manager services/manager
```

## Option 4: Verify Repository URLs

The repositories might have different names or be under a different organization. Check:

1. **In your Terraform Cloud Build config**, the URLs are:
   - `https://github.com/alexbakimpv/amplifychat-1eee5cdc.git`
   - `https://github.com/alexbakimpv/appsec-unilab-manager.git`

2. **Verify these exist** by visiting:
   - https://github.com/alexbakimpv/amplifychat-1eee5cdc
   - https://github.com/alexbakimpv/appsec-unilab-manager

3. **If they don't exist**, check:
   - Are they under a different username/organization?
   - Do they have different names?
   - Are they in a different Git provider (GitLab, Bitbucket, etc.)?

## Option 5: Use Credential Helper with PAT

Store PAT in credential helper:

```bash
# Set up credential helper to use PAT
git config --global credential.helper osxkeychain

# Or use GIT_ASKPASS for non-interactive
export GIT_ASKPASS=echo
export GIT_USERNAME=your-username
export GIT_PASSWORD=your-pat-token

git submodule add https://github.com/alexbakimpv/amplifychat-1eee5cdc.git services/amplify-air
```

## Troubleshooting

### "Repository not found" (404)
- Repository is private and requires authentication
- Repository URL might be incorrect
- You might not have access to the repository

**Solution**: Use a PAT or verify you have access to the repositories

### "Permission denied"
- SSH key not added to GitHub
- Wrong SSH key being used
- PAT doesn't have correct scopes

**Solution**: 
- For SSH: Add key to GitHub account
- For HTTPS: Generate new PAT with `repo` scope

### Credentials not being prompted
Git might be using cached credentials. Clear them:

```bash
# Clear cached credentials for GitHub
git credential-osxkeychain erase
host=github.com
protocol=https
# Press Enter twice

# Then try again - it will prompt for credentials
```

## Quick Test

Test if you can access the repositories:

```bash
# Test HTTPS access (will prompt for credentials)
git ls-remote https://github.com/alexbakimpv/amplifychat-1eee5cdc.git

# Test SSH access
git ls-remote git@github.com:alexbakimpv/amplifychat-1eee5cdc.git
```

If either works, use that method to add the submodules.
