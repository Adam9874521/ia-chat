# ia-chat

**UML Forge** — une SPA statique qui convertit du JSON en diagramme UML en s’appuyant sur OpenRouter + PlantUML.

## 📁 Structure du projet

- `index.html` — interface frontend principale
- `style.css` — design visuel premium et responsive
- `app.js` — logique SPA, validation JSON, appel backend
- `api/generate.js` — fonction serverless Vercel proxy vers OpenRouter
- `.env.example` — exemple de variable d’environnement pour la clé OpenRouter

## 🧠 Architecture

Cette application est conçue pour fonctionner en mode hybride :

- Frontend 100% statique sur GitHub Pages
- Backend serverless sur Vercel
- Clé OpenRouter protégée côté serveur

## 🚀 Développement local

1. Clone le dépôt.
2. Copie `.env.example` vers `.env` et ajoute ta clé OpenRouter :
   - `OPENROUTER_API_KEY=ta_cle_openrouter`
3. Depuis la racine du projet, lance le backend local :
   - `npx vercel dev`
4. Ouvre l’URL locale affichée par Vercel.
5. Connecte-toi avec le mot de passe : `Secret123!`
6. Colle un JSON valide et clique sur **Générer le diagramme UML**.

## 🌐 Déploiement

### Backend Vercel

1. Installe la CLI Vercel si nécessaire :
   - `npm i -g vercel`
2. Connecte-toi sur Vercel :
   - `vercel login`
3. Déploie le projet :
   - `vercel`
4. Configure la variable d’environnement dans Vercel :
   - `OPENROUTER_API_KEY`
5. Le fichier backend se trouve dans : `api/generate.js`

### Frontend GitHub Pages

1. Pousse le dépôt sur GitHub.
2. Ouvre les paramètres du dépôt (`Settings > Pages`).
3. Choisis la branche `main` et le dossier `/root`.
4. Enregistre pour activer GitHub Pages.
5. Mets à jour `BACKEND_ENDPOINT` dans `app.js` avec l’URL de ton backend Vercel.

## 🔧 Configuration frontend

Dans `app.js`, remplace cette valeur par l’URL réelle de ton backend déployé :

```js
const BACKEND_ENDPOINT = 'https://your-vercel-app.vercel.app/api/generate';
```

## 🔐 Sécurité

- La clé OpenRouter ne doit jamais être exposée dans le navigateur.
- Le backend `api/generate.js` est le seul endroit où la clé est utilisée.
- Ne pousse jamais `.env` dans le dépôt.

## ✅ Bonus

- Interface visuelle revisitée avec un style sombre distinctif.
- Animations d’entrée, mise en page panel gauche / droite.
- Validation JSON côté frontend et feedback utilisateur.

## 📌 Notes

- L’endpoint backend attendu par le frontend est `/api/generate`.
- Utilise GitHub Pages pour le frontend et Vercel pour le backend pour garder l’architecture sécurisée.
 
