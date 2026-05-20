import { useParams } from 'react-router';

interface DetailPageProps {
  match?: { params: { name: string; ns: string } };
  name?: string;
  namespace?: string;
}

export function useDetailPageParams(props: DetailPageProps): { name: string; ns: string } {
  const routeParams = useParams<{ name: string; ns: string }>();
  return {
    name: props.match?.params?.name ?? props.name ?? routeParams.name ?? '',
    ns: props.match?.params?.ns ?? props.namespace ?? routeParams.ns ?? '',
  };
}

export type { DetailPageProps };
