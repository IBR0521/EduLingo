/**
 * Responsive design utilities and breakpoints
 */

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const

/**
 * Responsive class utilities
 */
export const responsive = {
  // Container padding
  containerPadding: "px-4 sm:px-6 lg:px-8",
  
  // Grid columns
  gridCols: {
    mobile: "grid-cols-1",
    tablet: "sm:grid-cols-2",
    desktop: "lg:grid-cols-3",
    wide: "xl:grid-cols-4",
  },
  
  // Text sizes
  text: {
    h1: "text-3xl sm:text-4xl lg:text-5xl",
    h2: "text-2xl sm:text-3xl lg:text-4xl",
    h3: "text-xl sm:text-2xl lg:text-3xl",
    body: "text-sm sm:text-base",
    small: "text-xs sm:text-sm",
  },
  
  // Spacing
  spacing: {
    section: "py-8 sm:py-12 lg:py-16",
    card: "p-4 sm:p-6",
    gap: "gap-4 sm:gap-6",
  },
  
  // Table responsive
  table: "w-full overflow-x-auto",
  tableWrapper: "min-w-full divide-y divide-border",
  
  // Card grid
  cardGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6",
  
  // Button sizes
  button: {
    sm: "h-8 px-3 text-xs sm:text-sm",
    md: "h-10 px-4 text-sm sm:text-base",
    lg: "h-12 px-6 text-base sm:text-lg",
  },
  
  // Form inputs
  input: "w-full text-sm sm:text-base",
  
  // Navigation
  nav: "flex flex-col sm:flex-row gap-2 sm:gap-4",
  
  // Dashboard layout
  dashboard: "flex flex-col lg:flex-row gap-4 lg:gap-6",
  
  // Sidebar
  sidebar: "w-full lg:w-64 xl:w-80",
  
  // Main content
  mainContent: "flex-1 min-w-0",
}



