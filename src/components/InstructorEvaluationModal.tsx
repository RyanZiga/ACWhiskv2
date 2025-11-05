import React, { useState } from 'react';
import { X, Star, Send, Loader2, ChefHat, Clock, AlertCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { StarRating } from './StarRating';

interface DishEvaluation {
  id: string;
  dish_name: string;
  description: string;
  images: string[];
  difficulty: string;
  prep_time: number;
  notes: string;
  student_id: string;
  student_name: string;
  student_avatar?: string;
  instructor_id: string;
  status: 'pending' | 'completed';
  rating?: number;
  feedback?: string;
  created_at: string;
}

interface InstructorEvaluationModalProps {
  user: any;
  evaluation: DishEvaluation;
  onClose: () => void;
  onSubmit: () => void;
}

export function InstructorEvaluationModal({
  user,
  evaluation,
  onClose,
  onSubmit,
}: InstructorEvaluationModalProps) {
  const [rating, setRating] = useState(evaluation.rating || 0);
  const [feedback, setFeedback] = useState(evaluation.feedback || '');
  const [submitting, setSubmitting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    if (!feedback.trim()) {
      toast.error('Please provide feedback');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/dish-evaluations/${evaluation.id}/evaluate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating,
            feedback,
          }),
        }
      );

      if (response.ok) {
        toast.success('Evaluation submitted successfully!');
        onSubmit();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit evaluation');
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-500 bg-green-500/10';
      case 'Medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'Hard':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Evaluate Dish</h2>
              <p className="text-sm text-muted-foreground">
                Provide feedback for {evaluation.student_name}'s dish
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Student Info */}
          <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
              {evaluation.student_avatar ? (
                <ImageWithFallback
                  src={evaluation.student_avatar}
                  alt={evaluation.student_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-medium">
                  {evaluation.student_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">{evaluation.student_name}</p>
              <p className="text-sm text-muted-foreground">
                Submitted {new Date(evaluation.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Dish Details */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {evaluation.dish_name}
                </h3>
                <div className="flex items-center space-x-3 mt-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                      evaluation.difficulty
                    )}`}
                  >
                    {evaluation.difficulty}
                  </span>
                  {evaluation.prep_time > 0 && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{evaluation.prep_time} mins</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm font-medium text-foreground mb-2">Description</p>
              <p className="text-muted-foreground">{evaluation.description}</p>
            </div>

            {/* Additional Notes */}
            {evaluation.notes && (
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-2">Student Notes</p>
                <p className="text-muted-foreground">{evaluation.notes}</p>
              </div>
            )}

            {/* Image Gallery */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Dish Images</p>
              
              {/* Main Image */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                <ImageWithFallback
                  src={evaluation.images[currentImageIndex]}
                  alt={`${evaluation.dish_name} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Image Navigation */}
                {evaluation.images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImageIndex((prev) =>
                          prev === 0 ? evaluation.images.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
                    >
                      <span className="text-xl">‹</span>
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImageIndex((prev) =>
                          prev === evaluation.images.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
                    >
                      <span className="text-xl">›</span>
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                      {evaluation.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex
                              ? 'bg-white w-6'
                              : 'bg-white/50 hover:bg-white/80'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Grid */}
              {evaluation.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {evaluation.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentImageIndex
                          ? 'border-primary'
                          : 'border-transparent hover:border-border'
                      }`}
                    >
                      <ImageWithFallback
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Evaluation Form */}
          <form onSubmit={handleSubmit} className="space-y-6 pt-6 border-t border-border">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Rating *
              </label>
              <div className="flex items-center space-x-2">
                <StarRating
                  rating={rating}
                  onRate={setRating}
                  size="lg"
                  interactive={!submitting && evaluation.status === 'pending'}
                />
                <span className="text-sm text-muted-foreground ml-3">
                  {rating > 0 ? `${rating}/5` : 'No rating'}
                </span>
              </div>
            </div>

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Feedback *
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide detailed feedback on presentation, technique, creativity, taste (if applicable), and suggestions for improvement..."
                rows={6}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                disabled={submitting || evaluation.status === 'completed'}
              />
            </div>

            {/* Status Info */}
            {evaluation.status === 'completed' && (
              <div className="flex items-start space-x-2 text-muted-foreground bg-muted/50 rounded-xl p-4">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Evaluation Completed</p>
                  <p>This evaluation has already been submitted and the student has been notified.</p>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-foreground hover:bg-muted rounded-xl transition-colors"
                disabled={submitting}
              >
                {evaluation.status === 'completed' ? 'Close' : 'Cancel'}
              </button>
              {evaluation.status === 'pending' && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Evaluation</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
