# GuideFigure Integration Prompt

Brug denne prompt i dit React Native projekt for at integrere GuideFigure-komponenten.

---

## PROMPT TIL CURSOR/AI:

```
Jeg vil integrere en animeret figur-komponent i mit React Native projekt.

Jeg har allerede react-native-svg installeret. Komponenten bruger KUN 
react-native-svg og den indbyggede Animated API (ingen andre dependencies).

Jeg har følgende filer som skal integreres (ligger i src/components/GuideFigure/):
- GuideFigure.tsx - Hovedkomponenten (SVG-baseret figur)
- types.ts - TypeScript interfaces for poses og animationer
- useAnimation.ts - Hook til at afspille keyframe-animationer
- index.ts - Eksporter
- animations/*.json - Timeline animationsdata (vinke, ballet, etc.)
- poses/Standard_new_poses.json - 28 statiske poses (standard, kram, zen, etc.)

### Hvad jeg skal have hjælp til:

1. **Tjek at filerne er på plads** i src/components/GuideFigure/

2. **Opdater useAnimation.ts** til at importere animationerne (hvis jeg vil bruge dem):
   ```typescript
   import vinkeAnimation from './animations/vinke.json';
   import { registerAnimation } from './useAnimation';
   
   // Registrer ved app start
   registerAnimation('vinke', vinkeAnimation);
   ```

3. **Test komponenten** med en simpel skærm:
   ```tsx
   import { GuideFigure, DEFAULT_POSE } from '@/components/GuideFigure';
   
   <GuideFigure pose={DEFAULT_POSE} color="#d97706" size={200} label="Test" />
   ```

4. **For at bruge poses fra Standard_new_poses.json**:
   ```tsx
   import poses from '@/components/GuideFigure/poses/Standard_new_poses.json';
   
   // Find en pose ved navn
   const kramPose = poses.find(p => p.name === 'kram')?.pose;
   <GuideFigure pose={kramPose} color="#d97706" size={200} />
   ```

### Vigtigt:

- INGEN ekstra dependencies udover react-native-svg ✓
- Bruger React Native's indbyggede Animated API
- Animationsdata er identisk med det originale HTML/CSS format
- poses/Standard_new_poses.json indeholder 28 navngivne poses

### Test efter integration:

1. Render en figur med DEFAULT_POSE - bekræft den vises
2. Skift pose og se at den animerer smoothly
3. Test flere figurer ved siden af hinanden
```

---

## Dependencies

**Krævet:**
- ✅ react-native-svg (allerede installeret)

**IKKE krævet:**
- ❌ ~~react-native-reanimated~~ (ikke nødvendig)
- ❌ ~~pod install for animations~~ (ikke nødvendig)
- ❌ ~~babel.config.js ændringer~~ (ikke nødvendig)

---

## Fil-struktur

```
src/components/GuideFigure/
├── GuideFigure.tsx        # Hovedkomponent med SVG rendering
├── types.ts               # TypeScript interfaces
├── useAnimation.ts        # Animation hook (timeline keyframes)
├── index.ts               # Eksporter
├── animations/            # Timeline animationer
│   ├── vinke.json
│   ├── ballet.json
│   ├── finskdisko.json
│   ├── saturday.json
│   └── waveBreakD.json
└── poses/                 # Statiske poses
    └── Standard_new_poses.json  # 28 navngivne poses
```

---

## Brug

### Simpel figur med statisk pose

```tsx
import { GuideFigure, DEFAULT_POSE } from '@/components/GuideFigure';

<GuideFigure 
  pose={DEFAULT_POSE} 
  color="#d97706" 
  size={150} 
  label="Mig" 
/>
```

### Brug navngivne poses

```tsx
import { GuideFigure } from '@/components/GuideFigure';
import poses from '@/components/GuideFigure/poses/Standard_new_poses.json';

// Find pose ved navn
const getPose = (name: string) => poses.find(p => p.name === name)?.pose;

<GuideFigure pose={getPose('kram')} color="#d97706" size={150} />
<GuideFigure pose={getPose('zen')} color="#3b82f6" size={150} />
<GuideFigure pose={getPose('stærk')} color="#10b981" size={150} />
```

### Flere figurer side-by-side

```tsx
<View style={{ flexDirection: 'row', gap: 10 }}>
  <GuideFigure pose={pose1} color="#d97706" size={80} label="Mor" />
  <GuideFigure pose={pose2} color="#3b82f6" size={80} label="Far" />
  <GuideFigure pose={pose3} color="#10b981" size={80} label="Mig" />
</View>
```

### Med keyframe animation

```tsx
import { GuideFigure, useAnimation, registerAnimation } from '@/components/GuideFigure';
import vinkeAnimation from '@/components/GuideFigure/animations/vinke.json';

// Registrer animation (gør dette én gang, fx i App.tsx)
registerAnimation('vinke', vinkeAnimation);

// I din komponent
const { pose, isPlaying, play, stop } = useAnimation({ 
  animation: 'vinke', 
  loop: true 
});

<GuideFigure pose={pose} color="#d97706" size={150} />
```

---

## Pose Data Reference

Hver pose har følgende properties:

| Property | Type | Beskrivelse |
|----------|------|-------------|
| `translate_x` | number | Højre skulder X offset |
| `translate_y` | number | Højre skulder Y offset |
| `skulder_rot` | number | Højre skulder rotation (grader) |
| `albue_rot` | number | Højre albue rotation (grader) |
| `translate_x_left` | number | Venstre skulder X offset |
| `translate_y_left` | number | Venstre skulder Y offset |
| `skulder_rot_left` | number | Venstre skulder rotation (grader) |
| `albue_rot_left` | number | Venstre albue rotation (grader) |
| `translate_x_right_leg` | number | Højre hofte X offset |
| `translate_y_right_leg` | number | Højre hofte Y offset |
| `hofte_rot_right` | number | Højre hofte rotation (grader) |
| `knae_rot_right` | number | Højre knæ rotation (grader) |
| `translate_x_left_leg` | number | Venstre hofte X offset |
| `translate_y_left_leg` | number | Venstre hofte Y offset |
| `hofte_rot_left` | number | Venstre hofte rotation (grader) |
| `knae_rot_left` | number | Venstre knæ rotation (grader) |
| `left_arm_front` | boolean | Venstre arm foran kroppen |
| `right_arm_front` | boolean | Højre arm foran kroppen |

---

## Tilgængelige Poses (Standard_new_poses.json)

28 poses: `standard`, `stærk`, `tænke`, `ud`, `hej`, `leg`, `drejet`, `vred`, 
`knæ`, `genert`, `modløs`, `lukket`, `zen`, `trist`, `kom`, `slapper`, `baby`, 
`flyver`, `kram`, `går`, `ryg`, `sidder`, `beder`, `hænger`, `fast`, `svane`, 
`balance`, `tak`

---

## Troubleshooting

**Problem: Figuren vises ikke**
- Tjek at `react-native-svg` er installeret
- Tjek at `size` prop er sat (default er 150)

**Problem: Pose-ændringer animerer ikke**
- Sørg for at pose-objektet er et nyt objekt (ikke muteret)
- `useNativeDriver: false` er krævet for SVG (allerede sat i koden)

**Problem: Animation virker ikke**
- Tjek at animationen er registreret med `registerAnimation()`
- Tjek at animation-navnet matcher
