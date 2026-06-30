export const formatDate = (value: string) => {
  const dateOnly = value.includes('T') ? value.slice(0, 10) : value;
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString('en-IN');
};
