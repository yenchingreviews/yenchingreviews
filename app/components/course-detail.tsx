import Link from 'next/link';
import { trackToken } from '@/app/components/track-token';
import type { Course, Review } from '@/types/course';

type CourseDetailProps = {
  course: Course | null;
  reviews: Review[];
  writeReviewHref: string | null;
};

function renderTerm(review: Review) {
  if (review.term_label) return review.term_label;
  if (review.term_season && review.term_year) return `${review.term_season} ${review.term_year}`;
  return 'Term unavailable';
}

export function CourseDetail({ course, reviews, writeReviewHref }: CourseDetailProps) {
  if (!course) {
    return (
      <section className="panel detail-panel detail-panel-empty">
        <p className="detail-empty-message">Select a course from the catalog to see reviews.</p>
      </section>
    );
  }

  return (
    <section className="panel detail-panel">
      <div className="detail-header">
        <h2 className="detail-name">{course.course_name}</h2>
        <div className="meta detail-meta">
          {course.category_type && (
            <span className={`tag category ${course.category_type === 'Yenching' ? 'is-yenching' : 'is-pku'}`}>
              {course.category_type}
            </span>
          )}
          {course.track_name && <span className={`tag ${trackToken(course.track_name)}`}>{course.track_name}</span>}
          {course.language && <span className="tag language">{course.language}</span>}
        </div>
        {course.notes && <p className="course-notes">{course.notes}</p>}
      </div>

      <div className="reviews-heading">
        <h3>Reviews</h3>
        {writeReviewHref && (
          <Link href={writeReviewHref} className="inline-cta-button" scroll={false}>
            Write a Review
          </Link>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="empty-reviews">No reviews available yet for this course.</p>
      ) : (
        <ul className="review-list">
          {reviews.map((review) => (
            <li key={review.review_id} className="review-card">
              <div className="review-topline">
                <span className="review-term">{renderTerm(review)}</span>
                {review.professor_name && <span className="review-prof">Prof. {review.professor_name}</span>}
              </div>
              {review.review_text && <p>{review.review_text}</p>}

              <div className="review-meta">
                {review.rating_quality !== null && <span>Quality: {review.rating_quality}/5</span>}
                {review.rating_workload !== null && <span>Workload: {review.rating_workload}</span>}
                {review.used_for_track_credit !== null && (
                  <span>{review.used_for_track_credit ? 'Used for track credit' : 'Not used for track credit'}</span>
                )}
                {review.used_for_track && <span>Track: {review.used_for_track}</span>}
                {!review.is_anonymous && review.reviewer_display_name && <span>By: {review.reviewer_display_name}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
