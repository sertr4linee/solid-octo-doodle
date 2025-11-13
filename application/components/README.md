# Components Structure

Cette documentation décrit l'organisation des composants du projet Epitrello.

## 📁 Structure des dossiers

```
components/
├── auth/                  # Composants d'authentification
│   ├── login-form.tsx
│   └── register-form.tsx
│
├── backgrounds/           # Composants de fond et effets visuels
│   ├── dither-background.tsx
│   ├── dither.tsx
│   ├── gradient-mesh.tsx
│   └── prismatic-burst.tsx
│
├── layout/               # Composants de mise en page
│   ├── header.tsx
│   ├── header-01.tsx
│   └── menus.tsx
│
├── sections/             # Sections principales de la page
│   ├── features-section.tsx
│   ├── footer.tsx
│   ├── hero-section.tsx
│   ├── pricing.tsx
│   └── testimonials-section.tsx
│
├── ui/                   # Composants UI réutilisables
│   ├── badge.tsx
│   ├── bento-grid.tsx
│   ├── border-trail.tsx
│   ├── button.tsx
│   ├── checkbox.tsx
│   ├── field-1.tsx
│   ├── field.tsx
│   ├── grid-pattern.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── navigation-menu.tsx
│   ├── radio-group.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── slider.tsx
│   ├── switch.tsx
│   ├── textarea.tsx
│   └── toggle.tsx
│
└── theme-provider.tsx    # Provider de thème global
```

## 📝 Convention d'imports

### Auth Components
```tsx
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
```

### Background Components
```tsx
import { DitherBackground } from "@/components/backgrounds/dither-background";
import Dither from "@/components/backgrounds/dither";
```

### Layout Components
```tsx
import { Header } from "@/components/layout/header";
import { Menus } from "@/components/layout/menus";
```

### Section Components
```tsx
import { HeroSection } from "@/components/sections/hero-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { Pricing } from "@/components/sections/pricing";
import { Footer } from "@/components/sections/footer";
```

### UI Components
```tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
// ... etc
```

## 🎯 Description des dossiers

### `/auth`
Contient tous les formulaires et composants liés à l'authentification (login, register).

### `/backgrounds`
Composants pour les effets de fond animés (Dither, GradientMesh, etc.).

### `/layout`
Composants de structure de page (Header, Navigation, etc.).

### `/sections`
Sections principales de la landing page (Hero, Features, Testimonials, Pricing, Footer).

### `/ui`
Composants UI primitifs et réutilisables (Buttons, Inputs, Badges, etc.).

## ✨ Fichiers supprimés
- `theme-switch.tsx` - Supprimé car le toggle dark/light n'est plus utilisé
- `login-page.tsx` - Fichier dupliqué inutilisé
- `single-pricing-card-1.tsx` - Remplacé par le composant Pricing
- `ui/gradient-mesh.tsx` - Déplacé vers backgrounds/
