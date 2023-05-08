export const PAGINATION_DEFAULT_LIMIT = 12;
export const OFFSET_DEFAULT = 0;

export const getLimit = (limit?: string): number => {
  if (!limit) return PAGINATION_DEFAULT_LIMIT;
  const limitNum = parseInt(limit, 10);
  return limitNum;
};

export const getOffset = (offset?: string): number => {
  if (!offset) return OFFSET_DEFAULT;
  const limitNum = parseInt(offset, 10);
  return limitNum;
};

export const getNumPages = (total: number, limit: number): number => {
  return Math.ceil(total / limit);
};

export const getPageNumber = (offset: number, limit: number): number => {
  return Math.ceil(offset / limit);
};

export const getPagesPreview = (
  offset: number,
  limit: number,
  numPages: number
) => {
  const currentPage = getPageNumber(offset, limit);
  if (numPages <= 5) {
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }
  // if current page is closer to the end, show the 1st page and the last 5 pages
  if (currentPage <= 1) return [1, 2, 3, 4, numPages];
  if (currentPage === 2) {
    return [1, 2, 3, 4, numPages];
  }
  if (currentPage <= numPages - 2) {
    return [1, currentPage - 1, currentPage, currentPage + 1, numPages];
  }
  return [1, currentPage - 2, currentPage - 1, currentPage, numPages];
  //  return [1,currentPage-1, currentPage, currentPage+1, numPages]
};
