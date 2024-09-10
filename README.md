# TianGong LCA NEXT

## Install dependencies

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

nvm install
nvm alias default 20
nvm use

npm install
```

## Provided Scripts

Scripts provided in `package.json`. It's safe to modify or add additional script:

### Start project

```bash
npm start
```

### Build project

```bash
npm run build
```

### Check code style

```bash
npm run lint
```

You can also use script to auto fix some lint error:

```bash
npm run lint:fix
```

### Test code

```bash
npm test
```

### Publish
```bash
#list existing tags
git tag
#creat a new tag
git tag v0.0.1
#push this tag to origin
git push origin v0.0.1
```

## You can now run the Next.js local development server

🚀 **Use VSCode Launch Program configuration to Debug!** 🚀

The app should now be running on [localhost:8000](http://localhost:8000/).
