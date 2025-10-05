# Project Setup

## Installing Dependencies

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

nvm install
nvm alias default 22
nvm use

npm install

npm update && npm ci
```

## Configuration Files

You can modify or add extra scripts in the `package.json` file. Below are some pre-configured script commands:

### Debug the Project

🚀 **Start the project in debug mode using the command below** 🚀:

```bash
npm start
```

The application will run at: [localhost:8000](http://localhost:8000/)

### Check Code Formatting

```bash
npm run lint
```

### Check and Auto-Fix Code Formatting

```bash
npm run lint:fix
```

### Run Tests

```bash
npm test
```

### Build the Project

```bash
npm run build
```

## Automatic Deployment

The project's `.github/workflows/build.yml` file is configured with an automatic deployment workflow based on version tags. Simply create a tag that follows the format ‘v\*’ locally and push it to the remote repository to trigger a deployment. By configuring the keys `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the project, automatic deployment to Cloudflare Pages is enabled.

```bash
# List existing tags
git tag

# Create a new tag
git tag v0.0.1

# Push the tag to the remote repository
git push origin v0.0.1
```
