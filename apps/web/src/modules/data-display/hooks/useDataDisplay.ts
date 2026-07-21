import type { IGetAllParams } from '@/services/resource.service';
import { createResourceService } from '@/services/resource.service';
import { useEffect } from 'react';
import { useDataDisplayStore } from '../store/useDataDisplayStore';

interface UseDataDisplayOptions {
  endpoint: string;
  params?: Record<string, unknown>;
  onData?: (data: unknown[]) => void;
  skipAutoFetch?: boolean;
}

export function useDataDisplay({ endpoint, params, onData, skipAutoFetch = false }: UseDataDisplayOptions) {
  const { setData, setLoading, setError, setPagination, pagination } = useDataDisplayStore();

  const service = createResourceService(endpoint);

  async function fetchAll(overrideParams?: IGetAllParams) {
    setLoading(true);
    setError(null);
    try {
      console.log({ pagination, params, overrideParams });
      const mergedParams: IGetAllParams = {
        ...params,
        ...overrideParams,
        page: pagination.page,
        size: pagination.size,
      };
      const res = await service.getAll(mergedParams);
      console.log('Fetched data:', res);
      if (res?.metaData?.responseCode === 200) {
        setData(res.data);
        onData?.(res.data);
        setPagination(res?.metaData?.pagination ?? {});
      } else {
        setError(res?.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  async function deleteById(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await service.delete({ id });
      if (res.success) {
        await fetchAll();
      } else {
        setError(res.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  function changePage(page: number) {
    console.log('Changing page to', page);
    setPagination({ page });
  }

  function changeSize(size: number) {
    console.log('Changing size to', size);
    setPagination({ page: 1, size });
  }

  useEffect(() => {
    useDataDisplayStore.setState({ changePage, changeSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!skipAutoFetch) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, pagination.page, pagination.size, JSON.stringify(params), skipAutoFetch]);

  return { fetchAll, deleteById, changePage, changeSize };
}
