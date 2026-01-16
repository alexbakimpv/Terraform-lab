# Adding Submodules Without Breaking Existing Git Connection

## Why This is Safe

Git stores credentials **per-URL** in macOS Keychain. Adding submodules with different authentication won't affect your existing repository connection.

- Your current repo: `https://github.com/alexbakgitlab/Terraform-lab.git` ✅ (unchanged)
- New submodules: `https://github.com/alexbakimpv/...` (separate credentials)

## Method 1: HTTPS with URL-Specific Credentials (Recommended)

When you add submodules via HTTPS, macOS Keychain will:
1. Prompt you for credentials for the new repositories
2. Store them separately under the new repository URLs
3. **Not touch** your existing credentials

### Run this:

```bash
./setup-submodules-safe.sh
```

Or manually:

```bash
# This will prompt for credentials (stored separately in keychain)
git submodule add https://github.com/alexbakimpv/amplifychat-1eee5cdc.git services/amplify-air
git submodule add https://github.com/alexbakimpv/appsec-unilab-manager.git services/manager
git submodule update --init --recursive
```

**When prompted, enter:**
- Username: Your GitHub username for `alexbakimpv` account
- Password: Use a **Personal Access Token (PAT)** instead of password
  - Generate at: https://github.com/settings/tokens
  - Scopes needed: `repo` (full control of private repositories)

## Method 2: Use Different SSH Key (If Available)

If you have a different SSH key for the `alexbakimpv` account:

1. Add to your `~/.ssh/config`:
```
Host github-impv
  HostName github.com
  User git
  IdentityFile ~/.ssh/your_impv_key
  IdentitiesOnly yes
```

2. Add submodules using the new host:
```bash
git submodule add git@github-impv:alexbakimpv/amplifychat-1eee5cdc.git services/amplify-air
git submodule add git@github-impv:alexbakimpv/appsec-unilab-manager.git services/manager
```

## Method 3: Use Git Credential Helper with Different Accounts

Configure credential helper to store credentials per-URL:

```bash
# This is already set up by default on macOS (osxkeychain)
# Credentials are automatically stored per-URL
```

## Verify Your Setup

After adding submodules:

```bash
# Check submodules are added
git submodule status

# Verify your original remote is unchanged
git remote -v

# Test that your original repo still works
git fetch origin
```

## Managing Multiple GitHub Accounts

If you need to work with multiple GitHub accounts regularly:

1. **HTTPS**: Keychain stores credentials per-URL automatically
2. **SSH**: Use different host aliases in `~/.ssh/config` for each account
3. **Git Config**: Use local config per-repo (already done for submodules)

## Troubleshooting

### "Repository not found"
- Verify the repository URLs are correct
- Check you have access to the repositories
- Ensure you're using the correct GitHub account credentials

### "Permission denied"
- For HTTPS: Use a Personal Access Token (not password)
- For SSH: Ensure the SSH key is added to your GitHub account

### Credentials not working
- Check Keychain Access app for stored credentials
- Remove old credentials: `git credential-osxkeychain erase` (then enter URL)
- Re-enter credentials when prompted

## Your Current Setup

- **Main repo**: Uses HTTPS with credentials stored in Keychain
- **Credential helper**: `osxkeychain` (automatic per-URL storage)
- **SSH config**: Has `github-amplifys-launch` host alias configured

Adding submodules will **not** change any of this! ✅
