export const BP = {
  xs: 320, sm: 375, md: 640, lg: 768,
  xl: 1024, '2xl': 1280, '3xl': 1536, tv: 1920,
} as const;
export type Breakpoint = keyof typeof BP;
