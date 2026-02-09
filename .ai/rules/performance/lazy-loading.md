# Rule: Lazy Loading

## Summary
Load resources only when needed. Defer non-critical content to improve initial load time.

## DO ✅

### Components
- Lazy load routes/pages
- Lazy load modals and dialogs
- Lazy load below-the-fold content
- Provide loading fallbacks

### Images
- Use native lazy loading
- Provide width/height to prevent layout shift
- Use appropriate image formats
- Serve responsive images

### Data
- Paginate large lists
- Implement infinite scroll for feeds
- Prefetch on hover/focus
- Cache previously loaded data

## DON'T ❌

- Lazy load above-the-fold content
- Lazy load critical path components
- Show loading spinners for everything
- Forget error boundaries around lazy components

## Examples

### Good ✅
```tsx
// ✅ Route-level lazy loading with Suspense
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// ✅ Lazy load modal only when opened
const EditModal = lazy(() => import('./EditModal'));

function UserCard({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      <span>{user.name}</span>
      <button onClick={() => setIsEditing(true)}>Edit</button>

      {isEditing && (
        <Suspense fallback={<ModalSkeleton />}>
          <EditModal user={user} onClose={() => setIsEditing(false)} />
        </Suspense>
      )}
    </div>
  );
}

// ✅ Lazy load heavy feature
const ChartComponent = lazy(() => import('./Chart'));

function Analytics({ showChart }: { showChart: boolean }) {
  return (
    <div>
      <Stats />
      {showChart && (
        <Suspense fallback={<div className="chart-placeholder" />}>
          <ChartComponent />
        </Suspense>
      )}
    </div>
  );
}

// ✅ Native image lazy loading
function ImageGallery({ images }: { images: Image[] }) {
  return (
    <div className="gallery">
      {images.map(img => (
        <img
          key={img.id}
          src={img.url}
          alt={img.alt}
          loading="lazy"
          width={300}
          height={200}
          decoding="async"
        />
      ))}
    </div>
  );
}

// ✅ Intersection Observer for custom lazy loading
function LazySection({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? children : <Placeholder />}
    </div>
  );
}

// ✅ Prefetch on hover
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const prefetchPage = useCallback(() => {
    // Prefetch the route component
    import(`./pages/${to}`);
  }, [to]);

  return (
    <Link
      to={to}
      onMouseEnter={prefetchPage}
      onFocus={prefetchPage}
    >
      {children}
    </Link>
  );
}

// ✅ Paginated data loading
function UserList() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetchUsers({ page, limit: 20 }),
  });

  return (
    <div>
      {data?.users.map(user => <UserCard key={user.id} user={user} />)}
      <Pagination page={page} total={data?.total} onPageChange={setPage} />
    </div>
  );
}
```

### Bad ❌
```tsx
// ❌ Lazy loading critical above-the-fold content
const Header = lazy(() => import('./Header')); // Header should load immediately!

// ❌ No fallback
function App() {
  const Page = lazy(() => import('./Page'));
  return <Page />; // Crashes without Suspense
}

// ❌ Too many loading states
function Dashboard() {
  return (
    <div>
      <Suspense fallback={<Spinner />}><Stats /></Suspense>
      <Suspense fallback={<Spinner />}><Chart /></Suspense>
      <Suspense fallback={<Spinner />}><Table /></Suspense>
      {/* Jarring UX with 3 separate spinners */}
    </div>
  );
}

// ❌ Missing dimensions causes layout shift
<img src={url} loading="lazy" />
// Should have: width={} height={}

// ❌ Loading everything at once
function UserList({ users }: { users: User[] }) {
  return users.map(u => <UserCard key={u.id} user={u} />);
  // 1000 users = 1000 renders at once
}
```

## Loading Patterns

### Skeleton Loading
```tsx
// Better UX than spinners
function CardSkeleton() {
  return (
    <div className="card skeleton">
      <div className="skeleton-title" />
      <div className="skeleton-text" />
      <div className="skeleton-text" />
    </div>
  );
}
```

### Progressive Loading
```tsx
// Show partial content while loading more
function Feed() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: fetchFeedPage,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  return (
    <>
      {data?.pages.map(page =>
        page.items.map(item => <FeedItem key={item.id} item={item} />)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Load More</button>
      )}
    </>
  );
}
```

## Why This Matters

- Faster initial page load (better LCP)
- Reduced memory usage
- Lower bandwidth consumption
- Better mobile experience
- Improved Core Web Vitals
