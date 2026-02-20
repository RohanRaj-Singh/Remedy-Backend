// utils/paginate.ts
export const paginate = (query: any, page?: number, limit?: number) => {
  const currentPage = page && page > 0 ? page : 1;
  const perPage = limit && limit > 0 ? limit : 10;
  const skip = (currentPage - 1) * perPage;

  return query.skip(skip).limit(perPage);
};
