import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';

/**
 * Tamaño de página de las listas que crecen con el tiempo (pagos, membresías,
 * reservas, usuarios). PostgREST corta en 1000 filas sin avisar, así que esas
 * listas se piden por páginas con "Cargar más" en vez de todo de golpe.
 */
export const TAM_PAGINA = 30;

export interface Pagina<T> {
  items: T[];
  /** Total de filas que cumplen el filtro (count exacto de PostgREST). */
  total: number;
}

/** Rango [desde, hasta] (inclusive) de la página `pagina` (0-based) para `.range()`. */
export function rango(pagina: number): [number, number] {
  const desde = pagina * TAM_PAGINA;
  return [desde, desde + TAM_PAGINA - 1];
}

/**
 * Lista paginada con TanStack Query. `invalidateQueries({ queryKey })` sigue
 * funcionando igual que con useQuery (recarga las páginas ya abiertas).
 */
export function usePaginado<T>(
  queryKey: QueryKey,
  cargarPagina: (pagina: number) => Promise<Pagina<T>>,
  opciones: { enabled?: boolean; staleTime?: number; refetchOnMount?: boolean | 'always'; refetchOnWindowFocus?: boolean } = {}
) {
  const q = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => cargarPagina(pageParam),
    initialPageParam: 0,
    getNextPageParam: (ultima, todas) => {
      const cargados = todas.reduce((n, p) => n + p.items.length, 0);
      return cargados < ultima.total ? todas.length : undefined;
    },
    ...opciones,
  });

  return {
    items: q.data?.pages.flatMap((p) => p.items),
    total: q.data?.pages[0]?.total ?? 0,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    hayMas: q.hasNextPage,
    cargandoMas: q.isFetchingNextPage,
    cargarMas: () => q.fetchNextPage(),
    refetch: q.refetch,
  };
}
