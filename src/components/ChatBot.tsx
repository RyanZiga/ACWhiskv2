import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, HelpCircle, Search, ChefHat, Utensils, Clock, Thermometer, Users, BookOpen, Star, ArrowRight, Sparkles } from 'lucide-react'

// Gemini API Configuration
const GEMINI_API_KEY = 'AIzaSyDyUg2FIWKve9YAP3bytJ2aWFZRQP4C970'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

interface Message {
  id: string
  content: string
  sender: 'user' | 'bot'
  timestamp: Date
  type?: 'text' | 'faq' | 'suggestion' | 'ai'
}

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  keywords: string[]
  relatedFAQs?: string[]
}

const FAQS: FAQ[] = [
  // Cooking Techniques
  {
    id: 'knife-skills-basic',
    question: 'What are the basic knife skills every chef should know?',
    answer: 'The fundamental knife skills include: 1) Proper grip and stance, 2) Julienne (matchstick cuts), 3) Brunoise (fine dice), 4) Chiffonade (ribbon cuts for herbs), 5) Rough chop, 6) Mincing, and 7) Basic slicing. Practice these cuts daily with proper safety techniques.',
    category: 'Cooking Techniques',
    keywords: ['knife', 'cutting', 'basic', 'skills', 'dice', 'julienne', 'chop'],
    relatedFAQs: ['knife-safety', 'knife-maintenance']
  },
  {
    id: 'knife-safety',
    question: 'How do I practice knife safety in the kitchen?',
    answer: 'Key knife safety rules: 1) Keep knives sharp (dull knives are dangerous), 2) Use proper cutting boards, 3) Cut away from your body, 4) Keep fingers curled (claw grip), 5) Never try to catch a falling knife, 6) Clean and store knives properly, 7) Focus on your cutting - avoid distractions.',
    category: 'Safety',
    keywords: ['knife', 'safety', 'cutting', 'sharp', 'grip', 'fingers'],
    relatedFAQs: ['knife-skills-basic', 'kitchen-safety']
  },
  {
    id: 'searing-technique',
    question: 'How do I achieve the perfect sear on meat?',
    answer: 'For perfect searing: 1) Pat meat completely dry, 2) Season generously, 3) Heat pan until smoking hot, 4) Use oil with high smoke point, 5) Don\'t move the meat until it releases naturally, 6) Listen for the sizzle - silence means not hot enough, 7) Rest the meat after searing.',
    category: 'Cooking Techniques',
    keywords: ['sear', 'meat', 'pan', 'hot', 'oil', 'crust', 'maillard'],
    relatedFAQs: ['cooking-temperatures', 'resting-meat']
  },
  {
    id: 'emulsification',
    question: 'What is emulsification and how do I make stable sauces?',
    answer: 'Emulsification combines oil and water-based ingredients. For stable emulsions: 1) Add oil slowly while whisking constantly, 2) Use room temperature eggs, 3) Add acid (lemon juice/vinegar) to help stabilize, 4) If it breaks, start over with a fresh egg yolk and slowly whisk in the broken sauce.',
    category: 'Cooking Techniques',
    keywords: ['emulsion', 'sauce', 'mayonnaise', 'hollandaise', 'oil', 'egg', 'whisk'],
    relatedFAQs: ['sauce-mother-sauces', 'fixing-broken-sauce']
  },

  // Ingredients
  {
    id: 'seasoning-basics',
    question: 'When and how should I season my food?',
    answer: 'Season at multiple stages: 1) Season proteins 40 minutes before cooking, 2) Season vegetables as they cook, 3) Taste and adjust throughout cooking, 4) Finish with acid (lemon, vinegar) to brighten flavors, 5) Remember: you can always add more, but you can\'t take it away.',
    category: 'Ingredients',
    keywords: ['seasoning', 'salt', 'pepper', 'timing', 'taste', 'flavor'],
    relatedFAQs: ['salt-types', 'tasting-while-cooking']
  },
  {
    id: 'salt-types',
    question: 'What are the different types of salt and when should I use them?',
    answer: 'Salt types: 1) Kosher salt - everyday cooking, easy to pinch, 2) Table salt - baking (fine texture), 3) Sea salt - finishing, adds texture, 4) Flaky salt (Maldon) - finishing touches, 5) Flavored salts - specific applications. Use kosher salt for most cooking.',
    category: 'Ingredients',
    keywords: ['salt', 'kosher', 'sea', 'table', 'finishing', 'types'],
    relatedFAQs: ['seasoning-basics', 'finishing-salts']
  },
  {
    id: 'fresh-herbs',
    question: 'How do I properly use and store fresh herbs?',
    answer: 'Fresh herb tips: 1) Add delicate herbs (basil, cilantro) at the end, 2) Hearty herbs (rosemary, thyme) can cook longer, 3) Store soft herbs like flowers in water, 4) Store hard herbs wrapped in damp paper towels, 5) Freeze herbs in oil for later use.',
    category: 'Ingredients',
    keywords: ['herbs', 'fresh', 'basil', 'cilantro', 'storage', 'timing'],
    relatedFAQs: ['herb-combinations', 'growing-herbs']
  },
  {
    id: 'oil-selection',
    question: 'Which cooking oils should I use for different cooking methods?',
    answer: 'Oil selection guide: 1) High heat (searing, frying): avocado, grapeseed, canola, 2) Medium heat (sautéing): olive oil, vegetable oil, 3) Low heat/finishing: extra virgin olive oil, nut oils, 4) Baking: neutral oils like canola, 5) Consider smoke points and flavor profiles.',
    category: 'Ingredients',
    keywords: ['oil', 'cooking', 'smoke point', 'olive', 'avocado', 'frying', 'sautéing'],
    relatedFAQs: ['smoke-points', 'oil-storage']
  },

  // Equipment
  {
    id: 'essential-equipment',
    question: 'What are the essential tools every home cook should have?',
    answer: 'Essential kitchen tools: 1) Sharp chef\'s knife (8-10 inch), 2) Cutting boards (separate for meat/vegetables), 3) Cast iron or stainless steel pan, 4) Heavy-bottomed pot, 5) Digital thermometer, 6) Kitchen scale, 7) Measuring cups/spoons, 8) Wooden spoons, 9) Tongs, 10) Fine-mesh strainer.',
    category: 'Equipment',
    keywords: ['essential', 'tools', 'knife', 'pan', 'pot', 'thermometer', 'scale'],
    relatedFAQs: ['knife-selection', 'pan-types', 'thermometer-types']
  },
  {
    id: 'pan-types',
    question: 'What are the different types of pans and their uses?',
    answer: 'Pan types: 1) Cast iron - searing, oven use, retains heat, 2) Stainless steel - browning, deglazing, oven-safe, 3) Non-stick - eggs, delicate foods, easy cleanup, 4) Carbon steel - high heat, stir-frying, 5) Copper - precise temperature control, 6) Choose based on cooking method and maintenance preference.',
    category: 'Equipment',
    keywords: ['pans', 'cast iron', 'stainless steel', 'non-stick', 'carbon steel', 'copper'],
    relatedFAQs: ['pan-maintenance', 'seasoning-cast-iron']
  },
  {
    id: 'thermometer-types',
    question: 'What types of thermometers do I need for cooking?',
    answer: 'Thermometer types: 1) Instant-read - checking doneness of meat, 2) Probe thermometer - monitoring roasts, 3) Infrared - surface temperatures, 4) Candy thermometer - sugar work, 5) Oven thermometer - checking oven accuracy. An instant-read is most essential for food safety.',
    category: 'Equipment',
    keywords: ['thermometer', 'instant-read', 'probe', 'temperature', 'meat', 'candy'],
    relatedFAQs: ['cooking-temperatures', 'food-safety-temps']
  },

  // Food Safety
  {
    id: 'food-safety-temps',
    question: 'What are the safe internal temperatures for different meats?',
    answer: 'Safe internal temperatures: 1) Poultry - 165°F (74°C), 2) Ground meats - 160°F (71°C), 3) Pork - 145°F (63°C), 4) Whole cuts of beef/lamb - 145°F (63°C) for medium-rare, 5) Fish - 145°F (63°C), 6) Always use a thermometer and let meat rest after cooking.',
    category: 'Food Safety',
    keywords: ['temperature', 'safe', 'meat', 'poultry', 'pork', 'beef', 'fish', 'internal'],
    relatedFAQs: ['thermometer-types', 'resting-meat']
  },
  {
    id: 'food-storage',
    question: 'How should I properly store different types of food?',
    answer: 'Food storage guidelines: 1) Refrigerate perishables within 2 hours, 2) Store raw meat on bottom shelf, 3) Keep refrigerator at 40°F or below, 4) Use airtight containers for leftovers, 5) Label and date everything, 6) Follow FIFO (First In, First Out), 7) Don\'t store potatoes in the fridge.',
    category: 'Food Safety',
    keywords: ['storage', 'refrigerator', 'leftovers', 'temperature', 'containers', 'FIFO'],
    relatedFAQs: ['leftover-safety', 'freezer-storage']
  },
  {
    id: 'cross-contamination',
    question: 'How do I prevent cross-contamination in the kitchen?',
    answer: 'Prevent cross-contamination: 1) Use separate cutting boards for raw meat and vegetables, 2) Wash hands frequently, especially after handling raw meat, 3) Clean and sanitize surfaces regularly, 4) Don\'t use the same utensils for raw and cooked foods, 5) Store raw meats below ready-to-eat foods.',
    category: 'Food Safety',
    keywords: ['cross-contamination', 'cutting boards', 'raw meat', 'sanitize', 'utensils'],
    relatedFAQs: ['kitchen-sanitization', 'food-storage']
  },

  // Baking
  {
    id: 'baking-measurements',
    question: 'Why is measuring by weight important in baking?',
    answer: 'Weight measurements are crucial in baking because: 1) More accurate than volume, 2) Flour can vary greatly by scooping method, 3) Consistent results every time, 4) Professional recipes use weight, 5) Easier to scale recipes up or down. Invest in a digital kitchen scale for best results.',
    category: 'Baking',
    keywords: ['baking', 'measurements', 'weight', 'scale', 'flour', 'accuracy', 'consistent'],
    relatedFAQs: ['flour-types', 'scaling-recipes']
  },
  {
    id: 'oven-temperatures',
    question: 'How do I know if my oven temperature is accurate?',
    answer: 'Check oven accuracy: 1) Use an oven thermometer, 2) Most ovens run 25°F hot or cold, 3) Calibrate if possible, 4) Adjust recipes accordingly, 5) Preheat for at least 15-20 minutes, 6) Avoid opening door frequently, 7) Rotate pans halfway through for even baking.',
    category: 'Baking',
    keywords: ['oven', 'temperature', 'accurate', 'thermometer', 'calibrate', 'preheat'],
    relatedFAQs: ['baking-troubleshooting', 'even-baking']
  },
  {
    id: 'gluten-development',
    question: 'What is gluten and how does it affect my baking?',
    answer: 'Gluten basics: 1) Protein in wheat flour that creates structure, 2) Develops when flour meets liquid and is mixed, 3) More mixing = more gluten = chewier texture, 4) Less mixing = tender crumb (muffins, cakes), 5) Bread needs gluten development, pastries don\'t, 6) Rest doughs to relax gluten.',
    category: 'Baking',
    keywords: ['gluten', 'flour', 'mixing', 'structure', 'bread', 'pastry', 'texture'],
    relatedFAQs: ['flour-types', 'mixing-techniques']
  },

  // Recipe Development
  {
    id: 'recipe-scaling',
    question: 'How do I properly scale recipes up or down?',
    answer: 'Recipe scaling tips: 1) Use ratios and percentages when possible, 2) Be careful with leavening agents - don\'t always scale linearly, 3) Seasoning should be adjusted to taste, not just scaled, 4) Cooking times may change with larger quantities, 5) Test small batches first, 6) Consider equipment limitations.',
    category: 'Recipe Development',
    keywords: ['scaling', 'recipes', 'ratios', 'leavening', 'seasoning', 'quantities'],
    relatedFAQs: ['baker-percentages', 'recipe-testing']
  },
  {
    id: 'flavor-balancing',
    question: 'How do I balance flavors in my cooking?',
    answer: 'Flavor balancing: 1) Five tastes: sweet, sour, salty, bitter, umami, 2) Add acid to brighten dishes, 3) Fat carries flavors and adds richness, 4) Heat adds depth and complexity, 5) Texture contrasts enhance perception, 6) Taste and adjust throughout cooking, 7) Consider aromatics and fresh herbs.',
    category: 'Recipe Development',
    keywords: ['flavor', 'balance', 'sweet', 'sour', 'salty', 'bitter', 'umami', 'acid'],
    relatedFAQs: ['seasoning-basics', 'umami-sources']
  },
  {
    id: 'recipe-substitutions',
    question: 'How do I make ingredient substitutions in recipes?',
    answer: 'Substitution guidelines: 1) Understand the ingredient\'s role in the recipe, 2) Common swaps: butter for oil (3/4 ratio), buttermilk = milk + acid, 3) Egg substitutes: applesauce, flax eggs for binding, 4) Flour substitutions need adjustment ratios, 5) Test substitutions in small batches first.',
    category: 'Recipe Development',
    keywords: ['substitutions', 'ingredients', 'butter', 'eggs', 'flour', 'milk', 'alternatives'],
    relatedFAQs: ['ingredient-functions', 'dietary-modifications']
  },

  // Common Problems
  {
    id: 'fixing-broken-sauce',
    question: 'How do I fix a broken or separated sauce?',
    answer: 'Fixing broken sauces: 1) Hollandaise/Mayo: start with fresh egg yolk, slowly whisk in broken sauce, 2) Cream sauces: remove from heat, whisk in cold cream, 3) Oil-based: add ice cube and whisk vigorously, 4) Cheese sauces: lower heat, add liquid gradually, 5) Prevention: control temperature and add ingredients slowly.',
    category: 'Troubleshooting',
    keywords: ['broken', 'sauce', 'separated', 'hollandaise', 'mayonnaise', 'cream', 'cheese'],
    relatedFAQs: ['emulsification', 'sauce-mother-sauces']
  },
  {
    id: 'overcooked-meat',
    question: 'What can I do with overcooked meat?',
    answer: 'Salvaging overcooked meat: 1) Slice thin against the grain, 2) Add to soups or stews with liquid, 3) Shred for sandwiches with sauce, 4) Make meat salad with dressing, 5) Use in stir-fries with moisture, 6) For future: use thermometer and rest meat properly.',
    category: 'Troubleshooting',
    keywords: ['overcooked', 'meat', 'dry', 'tough', 'slice', 'shred', 'sauce'],
    relatedFAQs: ['cooking-temperatures', 'resting-meat']
  },
  {
    id: 'kitchen-disasters',
    question: 'How do I handle common kitchen disasters?',
    answer: 'Kitchen disaster solutions: 1) Burnt food: remove from heat immediately, transfer to clean pan, 2) Over-salted: add acid, dairy, or starchy ingredients, 3) Too spicy: add dairy, sugar, or starch, 4) Grease fire: turn off heat, cover with lid, never use water, 5) Stay calm and think through solutions.',
    category: 'Troubleshooting',
    keywords: ['disasters', 'burnt', 'over-salted', 'spicy', 'fire', 'emergency'],
    relatedFAQs: ['kitchen-safety', 'fixing-broken-sauce']
  }
]

const FAQ_CATEGORIES = [
  { name: 'Cooking Techniques', icon: ChefHat, color: 'text-purple-600' },
  { name: 'Ingredients', icon: Utensils, color: 'text-green-600' },
  { name: 'Equipment', icon: Clock, color: 'text-blue-600' },
  { name: 'Food Safety', icon: Thermometer, color: 'text-red-600' },
  { name: 'Baking', icon: Users, color: 'text-orange-600' },
  { name: 'Recipe Development', icon: BookOpen, color: 'text-indigo-600' },
  { name: 'Troubleshooting', icon: Star, color: 'text-yellow-600' }
]

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your AI-powered culinary assistant using Google Gemini. I can help you with cooking techniques, recipes, food safety, ingredient substitutions, and much more. Ask me anything or browse our FAQ topics below!",
      sender: 'bot',
      timestamp: new Date(),
      type: 'ai'
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showFAQs, setShowFAQs] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [useAI, setUseAI] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatHistoryRef = useRef<Array<{ role: string; parts: string }>>([])
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [buttonPosition, setButtonPosition] = useState({ 
    right: 24, 
    bottom: window.innerWidth < 768 ? 100 : 24 // Higher on mobile to avoid bottom navbar
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getGeminiResponse = async (userMessage: string): Promise<string> => {
    try {
      // Create a culinary-focused system prompt
      const systemContext = `You are a professional culinary assistant helping students and instructors in a culinary education platform called ACWhisk. Your role is to:
- Provide expert advice on cooking techniques, recipes, and food preparation
- Help with food safety and proper kitchen practices
- Suggest ingredient substitutions and recipe modifications
- Explain culinary terms and concepts
- Assist with baking, pastry, and various cuisines
- Be encouraging and educational

Keep responses concise (2-3 paragraphs max), practical, and easy to understand. Use bullet points when listing steps or tips.`

      // Build conversation history for context
      const contents = [
        {
          role: 'user',
          parts: [{ text: systemContext }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I am a professional culinary assistant ready to help with cooking techniques, recipes, food safety, and culinary education. How can I assist you today?' }]
        },
        ...chatHistoryRef.current.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.parts }]
        })),
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ]

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || response.statusText
        console.error('Gemini API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(`API Error: ${errorMessage}`)
      }

      const data = await response.json()
      
      // Check if we got a valid response
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response generated from AI')
      }

      const text = data.candidates[0]?.content?.parts?.[0]?.text

      if (!text) {
        throw new Error('Invalid response format from AI')
      }

      // Update chat history
      chatHistoryRef.current.push(
        { role: 'user', parts: userMessage },
        { role: 'model', parts: text }
      )

      // Keep only last 10 exchanges to manage context
      if (chatHistoryRef.current.length > 20) {
        chatHistoryRef.current = chatHistoryRef.current.slice(-20)
      }

      return text
    } catch (error) {
      console.error('Gemini API Error:', error)
      // Return a more helpful error message
      if (error instanceof Error && error.message.includes('not found')) {
        throw new Error('AI model temporarily unavailable. Please try FAQ mode or try again later.')
      }
      throw error
    }
  }

  const addMessage = (content: string, sender: 'user' | 'bot', type: 'text' | 'faq' | 'suggestion' = 'text') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date(),
      type
    }
    setMessages(prev => [...prev, newMessage])
  }

  const findBestAnswer = (query: string): FAQ | null => {
    const lowerQuery = query.toLowerCase()
    
    // Exact keyword match
    let bestMatch = FAQS.find(faq =>
      faq.keywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()))
    )

    // If no keyword match, try partial question match
    if (!bestMatch) {
      bestMatch = FAQS.find(faq =>
        faq.question.toLowerCase().includes(lowerQuery) ||
        lowerQuery.includes(faq.question.toLowerCase().split(' ').slice(0, 3).join(' '))
      )
    }

    return bestMatch || null
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    addMessage(userMessage, 'user')
    setIsTyping(true)
    setShowFAQs(false)

    try {
      if (useAI) {
        // Use Gemini AI for response
        const aiResponse = await getGeminiResponse(userMessage)
        addMessage(aiResponse, 'bot', 'ai')
        
        // Optionally suggest related FAQs based on keywords
        const bestAnswer = findBestAnswer(userMessage)
        if (bestAnswer && bestAnswer.relatedFAQs && bestAnswer.relatedFAQs.length > 0) {
          const relatedFAQs = FAQS.filter(faq => 
            bestAnswer.relatedFAQs?.includes(faq.id)
          ).slice(0, 3) // Limit to 3 suggestions
          
          if (relatedFAQs.length > 0) {
            const suggestions = relatedFAQs.map(faq => faq.question).join('\n• ')
            addMessage(`💡 You might also find these helpful:\n• ${suggestions}`, 'bot', 'suggestion')
          }
        }
      } else {
        // Use FAQ-based response (fallback)
        const bestAnswer = findBestAnswer(userMessage)
        
        if (bestAnswer) {
          addMessage(bestAnswer.answer, 'bot', 'faq')
          
          if (bestAnswer.relatedFAQs && bestAnswer.relatedFAQs.length > 0) {
            const relatedFAQs = FAQS.filter(faq => 
              bestAnswer.relatedFAQs?.includes(faq.id)
            )
            
            if (relatedFAQs.length > 0) {
              const suggestions = relatedFAQs.map(faq => faq.question).join('\n• ')
              addMessage(`Related topics you might find helpful:\n• ${suggestions}`, 'bot', 'suggestion')
            }
          }
        } else {
          addMessage(
            "I'd be happy to help! While I search for the best answer, here are some popular topics you might be interested in. You can also try rephrasing your question or browse our FAQ categories below.",
            'bot'
          )
          setShowFAQs(true)
        }
      }
    } catch (error) {
      console.error('Error getting response:', error)
      
      // Fallback to FAQ mode automatically
      const bestAnswer = findBestAnswer(userMessage)
      if (bestAnswer) {
        addMessage(
          "⚠️ AI is temporarily unavailable. Here's an answer from our FAQ library:\n\n" + bestAnswer.answer,
          'bot',
          'faq'
        )
      } else {
        addMessage(
          "I'm having trouble connecting to my AI brain right now. Let me switch you to FAQ mode for reliable answers! Please try browsing the topics below.",
          'bot'
        )
        setShowFAQs(true)
        // Auto-switch to FAQ mode
        setUseAI(false)
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleFAQClick = (faq: FAQ) => {
    addMessage(faq.question, 'user')
    setIsTyping(true)
    setShowFAQs(false)
    
    setTimeout(() => {
      addMessage(faq.answer, 'bot', 'faq')
      
      // Add related FAQs
      if (faq.relatedFAQs && faq.relatedFAQs.length > 0) {
        const relatedFAQs = FAQS.filter(f => faq.relatedFAQs?.includes(f.id))
        if (relatedFAQs.length > 0) {
          const suggestions = relatedFAQs.map(f => f.question).join('\n• ')
          addMessage(`You might also be interested in:\n• ${suggestions}`, 'bot', 'suggestion')
        }
      }
      
      setIsTyping(false)
    }, 800)
  }

  const filteredFAQs = FAQS.filter(faq => {
    if (selectedCategory && faq.category !== selectedCategory) return false
    if (searchQuery) {
      return faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
             faq.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    return true
  })

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setDragStart({ x: clientX, y: clientY })
  }

  // Handle drag move
  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return
      
      e.preventDefault()
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
      
      // Calculate deltas correctly for bottom/right positioning
      // For right: drag right (increase X) should decrease right value (move away from right edge)
      // For bottom: drag down (increase Y) should decrease bottom value (move away from bottom edge)
      const deltaX = dragStart.x - clientX
      const deltaY = dragStart.y - clientY
      
      setButtonPosition(prev => {
        // Add delta to move in the correct direction
        // Constrain to screen bounds with mobile navbar consideration
        const minBottom = isMobile ? 90 : 16 // Keep above mobile navbar
        const newRight = Math.max(16, Math.min(window.innerWidth - 72, prev.right + deltaX))
        const newBottom = Math.max(minBottom, Math.min(window.innerHeight - 72, prev.bottom + deltaY))
        return { right: newRight, bottom: newBottom }
      })
      
      setDragStart({ x: clientX, y: clientY })
    }

    const handleDragEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      document.addEventListener('touchmove', handleDragMove, { passive: false })
      document.addEventListener('touchend', handleDragEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('touchmove', handleDragMove)
      document.removeEventListener('touchend', handleDragEnd)
    }
  }, [isDragging, dragStart, isMobile])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <>
      {/* Chat Button - Draggable */}
      <button
        ref={buttonRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onClick={(e) => {
          if (!isDragging) {
            setIsOpen(true)
          }
        }}
        style={{
          bottom: `${buttonPosition.bottom}px`,
          right: `${buttonPosition.right}px`
        }}
        className={`fixed w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 hover:scale-110 hover:bg-[#1877f2] ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed w-96 h-[600px] bg-card rounded-2xl shadow-2xl border border-border flex flex-col z-50 max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] lg:max-h-[600px]"
          style={{
            bottom: isMobile ? '5rem' : `${buttonPosition.bottom + 72}px`,
            right: isMobile ? '1.5rem' : `${buttonPosition.right}px`,
            left: isMobile ? '1.5rem' : 'auto',
            width: isMobile ? 'calc(100vw - 3rem)' : '24rem'
          }}
        >
          {/* Header */}
          <div className="p-4 bg-primary text-white rounded-t-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center">
                  {useAI ? (
                    <Sparkles className="h-5 w-5 text-white" />
                  ) : (
                    <Bot className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Culinary Assistant</h3>
                  <p className="text-sm text-blue-100">
                    {useAI ? 'AI-Powered by Google Gemini' : 'FAQ-Based Helper'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-blue-100 transition-colors touch-target"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* AI Toggle */}
            <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
              <span className="text-sm">AI Mode</span>
              <button
                onClick={() => setUseAI(!useAI)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useAI ? 'bg-white' : 'bg-white/30'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${
                    useAI ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'bot' && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-primary text-white'
                      : message.type === 'ai'
                      ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-900 border border-purple-200'
                      : message.type === 'faq'
                      ? 'bg-blue-50 text-blue-900 border border-blue-200'
                      : message.type === 'suggestion'
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.type === 'ai' && message.sender === 'bot' && (
                    <div className="flex items-center space-x-1 mb-2">
                      <Sparkles className="h-3 w-3 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">AI Response</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-line leading-relaxed">
                    {message.content}
                  </p>
                  <p className="text-xs mt-2 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>

                {message.sender === 'user' && (
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted px-4 py-2 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* FAQ Section */}
            {showFAQs && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="font-medium text-foreground mb-2">Popular Topics</h4>
                  <p className="text-sm text-muted-foreground">Click on any topic to learn more</p>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors touch-target ${
                      !selectedCategory 
                        ? 'bg-primary text-white' 
                        : 'bg-secondary text-secondary-foreground hover:bg-muted'
                    }`}
                  >
                    All
                  </button>
                  {FAQ_CATEGORIES.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center space-x-1 touch-target ${
                        selectedCategory === category.name
                          ? 'bg-primary text-white'
                          : 'bg-secondary text-secondary-foreground hover:bg-muted'
                      }`}
                    >
                      <category.icon className="h-3 w-3" />
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-input text-foreground"
                  />
                </div>

                {/* FAQ List */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filteredFAQs.slice(0, 6).map((faq) => (
                    <button
                      key={faq.id}
                      onClick={() => handleFAQClick(faq)}
                      className="w-full text-left p-3 bg-secondary hover:bg-muted rounded-lg transition-colors group touch-target"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary">
                          {faq.question}
                        </p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{faq.category}</p>
                    </button>
                  ))}
                </div>

                {filteredFAQs.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <HelpCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm">No FAQs found. Try a different search term.</p>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about cooking..."
                className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-input text-foreground"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="p-2 bg-primary text-white rounded-lg hover:bg-[#1877f2] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            
            {!showFAQs && (
              <button
                onClick={() => setShowFAQs(true)}
                className="w-full mt-2 text-xs text-primary hover:text-[#1877f2] transition-colors touch-target"
              >
                Browse FAQ Topics
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}