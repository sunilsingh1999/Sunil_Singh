export interface StarterBlueprint {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
}

export const STARTER_BLUEPRINTS: StarterBlueprint[] = [
  {
    id: 'hindi-gk-quiz',
    title: 'Hindi GK Quiz Pro',
    category: 'Quiz & Exam App',
    description: 'Interactive Hindi & India GK MCQ quiz with instant score tracking and explanations.',
    prompt:
      'Build an interactive Hindi GK Quiz App (सामान्य ज्ञान क्विज़) with multiple-choice MCQ questions, live score counter, question progress indicator, instant right/wrong feedback, and a restart quiz button.',
  },
  {
    id: 'online-store',
    title: 'SmartShop Online Store',
    category: 'E-Commerce',
    description: 'Modern D2C shopping store with category tabs, add-to-cart, live subtotal & UPI checkout.',
    prompt:
      'Build an Online Store e-commerce shop app called "BharatSmart Store" with Electronics, Fashion & Home category filters, product cards with prices in ₹, interactive Add to Cart, live quantity controls, and a UPI / COD order confirmation panel.',
  },
  {
    id: 'digital-card',
    title: 'Digital Visiting Card',
    category: 'Business Card',
    description: 'Luxury interactive profile card with live editor, Call/WhatsApp links & .vcf download.',
    prompt:
      'Build a sleek Digital Visiting Card web app with live name & title customization, one-tap Call & WhatsApp buttons, Copy Phone button, and instant Save Contact (.vcf vCard) download.',
  },
  {
    id: 'fitness-app',
    title: 'FitBharat Workout & BMI',
    category: 'Health & Fitness',
    description: 'Live HIIT workout stopwatch, instant BMI calculator, exercise checklist & water tracker.',
    prompt:
      'Build an interactive Fitness & Workout App with a Start/Pause/Reset workout stopwatch timer, instant BMI calculator (weight kg / height cm), daily exercise checklist, and water intake glass counter.',
  },
  {
    id: 'shayari-app',
    title: 'Hindi Shayari Studio',
    category: 'Entertainment',
    description: 'Hindi Shayari collection with Love, Attitude, Motivation & Dosti filters, Copy & Favorites.',
    prompt:
      'Build a Hindi Shayari App with category tabs (Motivation, Attitude, Love, Dosti, Favorites), Random Shayari generator button, one-tap Copy button, and Save/Like favorites.',
  },
];
