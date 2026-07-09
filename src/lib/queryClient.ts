import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos siempre frescos: cada panel se actualiza al abrirlo y al volver
      // a la pestaña. Evita ver listas desactualizadas (p. ej. pagos o
      // solicitudes nuevas registradas mientras el panel estaba abierto).
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
