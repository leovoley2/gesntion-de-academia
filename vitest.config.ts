import { defineConfig } from 'vitest/config';

// Los tests corren en hora de Perú (UTC-5) para que los bugs de fechas
// UTC vs. local se reproduzcan igual que en producción, sin importar
// la zona horaria de la máquina donde se ejecuten.
process.env.TZ = 'America/Lima';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
