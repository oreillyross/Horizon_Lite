# Horizon Lite

**Spec-driven information snippets app** built with React Hook Form + Zod + tRPC + Wouter + shadcn/ui + Drizzle ORM. Clean, type-safe, performant.

### Motivation for this project

This project demonstrates my ability to rapidly build fully performant SAAS applications using a combination of best practices, such as gitflow lite, spec driven development using LLMs and AI agents as pair programmers. Allowing me as a strategic high-level tech lead to guide the project using as many AI agents as necessary. Making the high level decisions allowing the AI agents to quickly code up approved implementations.

## ✨ Features

- ✅ **Snippet Management** - Create, read, update, delete code snippets
- ✅ **Tag Support** - Organize snippets with tags  
- ✅ **Form Validation** - Zod schemas + React Hook Form
- ✅ **Type-Safe API** - tRPC end-to-end types
- ✅ **Clean UI** - shadcn/ui components
- 🔄 **Navigation** - Wouter router + dynamic navbar
- 🚀 **Fast** - Optimized for Replit deployment

## 🛠 Tech Stack

```
Frontend: React 18 + TypeScript + Tailwind + shadcn/ui + Wouter
Backend: tRPC + Drizzle ORM + Zod validation
Deployment: Replit
```

## 🚀 Quick Start

1. **Fork/Clone this Repl**
2. **Install dependencies** (Replit auto-installs)
3. **Run** - Click the green "Run" button
4. **Start coding** - Snippets work out of the box!

## 📁 Project Structure

```
├── app/
│   ├── snippets/           # Snippet CRUD pages
│   └── components/         # UI components
├── server/                 # tRPC procedures + DB
├── docs/                   # Spec-driven design files (*.md)
├── schema.ts               # Drizzle DB schema + Zod
└── README.md              # You're reading it!
```

## 🎯 Workflow

```
feature branches → develop (staging) → main (production)
```

- **Spec first**: Write `feature_xxx.md` specs
- **Feature branches**: `feature/snippet-route`, `feature/navigation`
- **Clean commits**: Semantic messages + tests
- **Regular releases**: `develop → main`

## 🤝 Contributing

1. Create feature spec: `docs/feature_xxx.md`
2. Branch: `git checkout -b feature/xxx`
3. Code → Test → Commit → PR to `develop`
4. Merge → Clean up branches

## 📄 License

MIT - Use freely, contribute back!

***

**Built with spec-driven development** - Check `docs/` for feature specs! 🚀
