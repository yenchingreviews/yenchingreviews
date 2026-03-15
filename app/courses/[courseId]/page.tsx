import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCategoryLabel } from '@/app/components/category-label';
import { getCourseById, getCourseReviews } from '@/lib/courses';

export const dynamic = 'force-dynamic';

type CourseDetailPageProps = {
  params: {
    courseId: string;
  };
};

function getReviewBody(review: Record<string, unknown>) {
  const textFields = ['review_text', 'content', 'comment', 'body', 'text'];

  for (const key of textFields) {
    const value = review[key];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const courseId = decodeURIComponent(params.courseId);

  const [courseResult, reviewResult] = await Promise.all([
    getCourseById(courseId),
    getCourseReviews(courseId),
  ]);

  if (!courseResult.error && !courseResult.course) {
    notFound();
  }

  return (
    <main className="page">
      <p>
        <Link href="/" className="back-link">
          ← back to courses
        </Link>
      </p>

      {courseResult.error && <p className="notice">{courseResult.error}</p>}
      {reviewResult.error && <p className="notice">{reviewResult.error}</p>}

      {courseResult.course && (
        <section className="panel course-header">
          <h1 className="brand course-detail-title">{courseResult.course.course_name}</h1>
          <div className="meta">
            {courseResult.course.category_type && <span className="tag">{formatCategoryLabel(courseResult.course.category_type)}</span>}
            {courseResult.course.track_name && <span className="tag">{courseResult.course.track_name}</span>}
            {courseResult.course.language && <span className="tag">{courseResult.course.language}</span>}
          </div>
        </section>
      )}

      <section className="panel">
        <h2 className="section-title">reviews</h2>

        {reviewResult.reviews.length === 0 ? (
          <p className="subtitle">No reviews yet for this course.</p>
        ) : (
          <ul className="review-list">
            {reviewResult.reviews.map((review, index) => {
              const dynamicReview = review as unknown as Record<string, unknown>;
              const reviewBody = getReviewBody(dynamicReview);
              const rating = typeof dynamicReview.rating === 'number' ? dynamicReview.rating : null;
              const term = typeof dynamicReview.term === 'string' ? dynamicReview.term : null;
              const professor =
                typeof dynamicReview.professor === 'string' ? dynamicReview.professor : null;
              const reviewKey =
                (typeof dynamicReview.review_id === 'string' && dynamicReview.review_id) ||
                (typeof dynamicReview.id === 'string' && dynamicReview.id) ||
                `${courseId}-${index}`;

              return (
                <li key={reviewKey} className="review-item">
                  <div className="meta">
                    {rating !== null && <span className="tag">rating: {rating}</span>}
                    {term && <span className="tag">term: {term}</span>}
                    {professor && <span className="tag">professor: {professor}</span>}
                  </div>
                  {reviewBody ? (
                    <p className="review-body">{reviewBody}</p>
                  ) : (
                    <p className="subtitle">Review text unavailable for this record.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
