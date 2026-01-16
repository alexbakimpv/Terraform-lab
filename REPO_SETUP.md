# Setting Up Service Repositories

This guide helps you connect the service repositories that your Terraform environment provisions.

## Repositories to Connect

1. **Amplify AIR**: `https://github.com/alexbakimpv/amplifychat-1eee5cdc.git`
2. **Manager (API + UI)**: `https://github.com/alexbakimpv/appsec-unilab-manager.git`

## Option 1: Add as Git Submodules (Recommended)

This allows you to work with Terraform and service code together, tracking specific versions.

### Using HTTPS (will prompt for credentials):

```bash
# Create services directory
mkdir -p services

# Add repositories as submodules
git submodule add https://github.com/alexbakimpv/amplifychat-1eee5cdc.git services/amplify-air
git submodule add https://github.com/alexbakimpv/appsec-unilab-manager.git services/manager

# Initialize and clone the submodules
git submodule update --init --recursive
```

### Using SSH (if you have SSH keys configured):

```bash
mkdir -p services

git submodule add git@github.com:alexbakimpv/amplifychat-1eee5cdc.git services/amplify-air
git submodule add git@github.com:alexbakimpv/appsec-unilab-manager.git services/manager

git submodule update --init --recursive
```

### If repositories are already cloned locally:

```bash
# If you have them cloned elsewhere, you can add them from local paths
git submodule add /path/to/your/amplifychat-1eee5cdc services/amplify-air
git submodule add /path/to/your/appsec-unilab-manager services/manager
```

## Option 2: Clone Separately (No Submodules)

If you prefer to keep repositories separate:

```bash
# Clone to a parent directory or separate location
cd ..
git clone https://github.com/alexbakimpv/amplifychat-1eee5cdc.git
git clone https://github.com/alexbakimpv/appsec-unilab-manager.git
```

## Working with Submodules

### Update all submodules to latest:
```bash
git submodule update --remote --recursive
```

### Update to specific commit:
```bash
cd services/amplify-air
git checkout <commit-hash>
cd ../..
git add services/amplify-air
git commit -m "Update amplify-air to specific version"
```

### Clone repository with submodules:
```bash
git clone --recursive <repo-url>
# Or if already cloned:
git submodule update --init --recursive
```

## Directory Structure After Setup

```
Terraform-lab/
├── services/
│   ├── amplify-air/          # AIR service repository
│   └── manager/              # Manager API + UI repository
├── *.tf                       # Terraform files
└── ...
```

## Troubleshooting

### Authentication Issues:
- For HTTPS: Use a Personal Access Token (PAT) when prompted
- For SSH: Ensure your SSH key is added to GitHub and loaded in ssh-agent

### Permission Denied:
- Verify you have access to the repositories
- Check repository URLs are correct
- Ensure your GitHub credentials are properly configured
