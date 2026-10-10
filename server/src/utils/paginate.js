

function getPagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 12, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPaginatedResponse(items, page, limit, totalItems) {
  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(Math.ceil(totalItems / limit), 1),
      hasNextPage: page * limit < totalItems,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = { getPagination, buildPaginatedResponse };
