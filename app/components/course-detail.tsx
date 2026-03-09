import type { Course, Review } from '@/types/course';

type CourseDetailProps = {
  course: Course | null;
  reviews: Review[];
};

function renderTerm(review: Review) {
  if (review.term_label) return review.term_label;
  if (review.term_season && review.term_year) return `${review.term_season} ${review.term_year}`;
  return 'Term unavailable';
}

export function CourseDetail({ course, reviews }: CourseDetailProps) {
  if (!course) {
    return (
      <section className="panel detail-panel detail-panel-empty">
        <h2 className="panel-title panel-title-filters">Course details</h2>
        <p className="detail-empty-message">Select a course from the catalog to see reviews.</p>
      </section>
    );
  }

  return (
    <section className="panel detail-panel">
      <h2 className="detail-name">{course.course_name}</h2>
      <div className="meta detail-meta">
        {course.category_type && (
          <span className={`tag category ${course.category_type === 'Yenching' ? 'is-yenching' : 'is-pku'}`}>
            {course.category_type}
          </span>
        )}
        {course.track_name && <span className="tag">{course.track_name}</span>}
        {course.language && <span className="tag language">{course.language}</span>}
      </div>
      {course.notes && <p className="course-notes">{course.notes}</p>}

      <div className="reviews-heading">
        <h3>Reviews</h3>
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
                {review.rating_workload !== null && <span>Workload: {review.rating_workload}/5</span>}
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
