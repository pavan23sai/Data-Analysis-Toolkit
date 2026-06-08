# Task 5: Data Search & Filter Feature

## Summary
Added a comprehensive search, filter, and pagination feature to the DataUpload component's data preview table.

## Changes Made
**File**: `src/components/DataUpload.tsx`

### New State Variables
- `searchQuery` (string) - current search text
- `rowsPerPage` (number) - rows per page (10, 25, 50, or -1 for All)
- `currentPage` (number) - current page index

### New Computed Values
- `filteredRows` (useMemo) - rows filtered by case-insensitive search across ALL columns
- `totalFilteredCount` - count of rows matching filter
- `totalCount` - total rows in dataset
- `isFiltering` - whether a search filter is active
- `effectiveRowsPerPage` - resolved rows per page (handles "All" case)
- `totalPages` - total number of pages
- `safeCurrentPage` - clamped current page
- `paginatedRows` (useMemo) - rows for current page

### New Callbacks
- `handleSearchChange` - updates search query and resets page to 1
- `handleRowsPerPageChange` - updates rows per page and resets page to 1

### UI Additions
1. **Search input** with Search icon, placeholder "Search across all columns...", and X clear button
2. **Rows per page selector** (10, 25, 50, All) using shadcn/ui Select
3. **Filter result count badge** showing "X results out of Y total rows"
4. **Pagination controls** with Previous/Next buttons, page number buttons, and ellipsis for large page counts
5. **Empty state** with "No rows match your search" and "Clear filter" link
6. **Dynamic CardDescription** showing filtered count vs total

### Reset Behavior
- Clearing dataset also resets searchQuery, currentPage, and rowsPerPage
- Changing search query resets to page 1
- Changing rows per page resets to page 1

### Styling
- Teal/emerald color scheme throughout (consistent with app)
- Dark mode support with `dark:` prefix classes
- Responsive layout (stacked on mobile, side-by-side on desktop)

## Lint Status
✅ Passed with no errors
