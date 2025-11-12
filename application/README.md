This is a [Next.js](https://nextjs.org) project with authentication using [Better Auth](https://better-auth.com) and PostgreSQL.

## 🚀 Getting Started

### Développement Local (Port 3000)

1. **Installer les dépendances** :
```bash
bun install
```

2. **Configurer l'environnement** :
   - Assurez-vous que PostgreSQL est lancé localement sur le port 5432
   - Vérifiez que `.env` contient : `DATABASE_URL="postgresql://user:password@localhost:5432/mydb"`
   - Vérifiez que `.env` contient : `BETTER_AUTH_URL="http://localhost:3000"`

3. **Initialiser la base de données** :
```bash
bun run prisma:generate
bun run prisma:migrate
```

4. **Lancer le serveur de développement** :
```bash
bun dev
```

5. **Ouvrir l'application** : [http://localhost:3000](http://localhost:3000)

---

### Docker (Port 8081)

1. **Modifier le `.env`** :
   - Changez `DATABASE_URL="postgresql://user:password@db:5432/mydb"`
   - Changez `BETTER_AUTH_URL="http://localhost:8081"`
   - Changez `NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:8081"`

2. **Lancer Docker Compose** (depuis la racine du projet) :
```bash
docker-compose up --build
```

3. **Ouvrir l'application** : [http://localhost:8081](http://localhost:8081)

---

## 📝 Configuration

Le fichier `.env` contient toutes les variables d'environnement nécessaires :
- **Database** : Connexion PostgreSQL
- **Better Auth** : Secret et URLs
- **OAuth** : Google & GitHub (optionnel)
- **Email/SMTP** : Pour les magic links

## 🔐 Authentification

L'application supporte :
- ✉️ Email/Password
- 🔗 Magic Link (email)
- 🌐 Google OAuth
- 🐙 GitHub OAuth

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
