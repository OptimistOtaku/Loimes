# Loimes: Envelope Message Board for Partners

This project is a dynamic website for two partners to leave messages for each other in cute envelope-style folders (thumbnails). Messages are saved in a database and visible to both partners.

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js/Express (to be added)
- **Database:** MongoDB or SQLite (to be added)

## Features
- Envelope-style folders (thumbnails) for messages
- Messages are visible to both partners
- Database integration for message storage

## Getting Started

### Install dependencies
```sh
npm install
```

### Start the development server
```sh
npm run dev
```

### Next Steps
- Add backend (Node.js/Express)
- Add database (MongoDB or SQLite)
- Connect frontend to backend for message storage and retrieval

---

This project was bootstrapped with Vite's React + TypeScript template.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
