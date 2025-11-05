import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  Star,
  Plus,
  Filter,
  Search,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { DishEvaluationModal } from './DishEvaluationModal';
import { InstructorEvaluationModal } from './InstructorEvaluationModal';

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
  instructor_name: string;
  status: 'pending' | 'completed';
  rating?: number;
  feedback?: string;
  created_at: string;
  evaluated_at?: string;
}

interface DishEvaluationsProps {
  user: any;
  onNavigate: (page: string, id?: string) => void;
}

export function DishEvaluations({ user, onNavigate }: DishEvaluationsProps) {
  const [evaluations, setEvaluations] = useState<DishEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<DishEvaluation | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const endpoint =
        user.role === 'instructor'
          ? '/dish-evaluations/instructor'
          : '/dish-evaluations/student';

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvaluations(data.evaluations || []);
      } else {
        toast.error('Failed to load evaluations');
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
      toast.error('Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter((evaluation) => {

    if (filter !== 'all' && evaluation.status !== filter) return false;


    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        evaluation.dish_name.toLowerCase().includes(query) ||
        evaluation.description.toLowerCase().includes(query) ||
        evaluation.student_name.toLowerCase().includes(query) ||
        (user.role === 'student' && evaluation.instructor_name.toLowerCase().includes(query))
      );
    }

    return true;
  });

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

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <div className="flex items-center space-x-1 px-3 py-1 bg-green-500/10 text-green-500 rounded-full">
          <CheckCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Completed</span>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-1 px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full">
        <Clock className="h-4 w-4" />
        <span className="text-xs font-medium">Pending</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">

      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dish Evaluations</h1>
                <p className="text-sm text-muted-foreground">
                  {user.role === 'instructor'
                    ? 'Review and evaluate student dishes'
                    : 'Submit your dishes for instructor feedback'}
                </p>
              </div>
            </div>
            {user.role === 'student' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>New Request</span>
              </button>
            )}
          </div>


          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2.5 rounded-xl transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2.5 rounded-xl transition-colors ${
                  filter === 'pending'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2.5 rounded-xl transition-colors ${
                  filter === 'completed'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Completed
              </button>
            </div>
          </div>
        </div>
      </div>


      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ChefHat className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery || filter !== 'all'
                ? 'No evaluations found'
                : 'No evaluations yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {user.role === 'student'
                ? 'Submit your first dish for evaluation'
                : 'No pending evaluations at the moment'}
            </p>
            {user.role === 'student' && !searchQuery && filter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Create Evaluation Request</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvaluations.map((evaluation) => (
              <div
                key={evaluation.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedEvaluation(evaluation)}
              >

                <div className="relative aspect-video bg-muted">
                  <ImageWithFallback
                    src={evaluation.images[0]}
                    alt={evaluation.dish_name}
                    className="w-full h-full object-cover"
                  />
                  {evaluation.images.length > 1 && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded-lg">
                      +{evaluation.images.length - 1} more
                    </div>
                  )}
                </div>


                <div className="p-5 space-y-4">

                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {evaluation.dish_name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {user.role === 'instructor'
                          ? `By ${evaluation.student_name}`
                          : `Instructor: ${evaluation.instructor_name}`}
                      </p>
                    </div>
                    {getStatusBadge(evaluation.status)}
                  </div>


                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {evaluation.description}
                  </p>


                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                        evaluation.difficulty
                      )}`}
                    >
                      {evaluation.difficulty}
                    </span>
                    {evaluation.prep_time > 0 && (
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{evaluation.prep_time}m</span>
                      </div>
                    )}
                    {evaluation.rating && (
                      <div className="flex items-center space-x-1 text-sm text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{evaluation.rating}/5</span>
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    {evaluation.status === 'completed' && evaluation.evaluated_at
                      ? `Evaluated ${new Date(evaluation.evaluated_at).toLocaleDateString()}`
                      : `Submitted ${new Date(evaluation.created_at).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {showCreateModal && (
        <DishEvaluationModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSubmit={loadEvaluations}
        />
      )}

      {selectedEvaluation && user.role === 'instructor' && (
        <InstructorEvaluationModal
          user={user}
          evaluation={selectedEvaluation}
          onClose={() => setSelectedEvaluation(null)}
          onSubmit={loadEvaluations}
        />
      )}

      {selectedEvaluation && user.role === 'student' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="font-semibold text-foreground">{selectedEvaluation.dish_name}</h2>
                <p className="text-sm text-muted-foreground">
                  Instructor: {selectedEvaluation.instructor_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvaluation(null)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>


            <div className="p-6 space-y-6">

              <div className="flex items-center justify-between">
                {getStatusBadge(selectedEvaluation.status)}
                <span className="text-sm text-muted-foreground">
                  Submitted {new Date(selectedEvaluation.created_at).toLocaleDateString()}
                </span>
              </div>


              <div className="grid grid-cols-2 gap-3">
                {selectedEvaluation.images.map((image, index) => (
                  <div key={index} className="aspect-square rounded-xl overflow-hidden">
                    <ImageWithFallback
                      src={image}
                      alt={`${selectedEvaluation.dish_name} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>


              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Description</p>
                  <p className="text-muted-foreground">{selectedEvaluation.description}</p>
                </div>

                {selectedEvaluation.notes && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Your Notes</p>
                    <p className="text-muted-foreground">{selectedEvaluation.notes}</p>
                  </div>
                )}

                {selectedEvaluation.status === 'completed' && (
                  <>
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center space-x-2 mb-3">
                        <Star className="h-5 w-5 text-yellow-500 fill-current" />
                        <span className="font-medium text-foreground">
                          Rating: {selectedEvaluation.rating}/5
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">
                        Instructor Feedback
                      </p>
                      <div className="bg-muted/50 rounded-xl p-4">
                        <p className="text-muted-foreground">{selectedEvaluation.feedback}</p>
                      </div>
                    </div>

                    {selectedEvaluation.evaluated_at && (
                      <p className="text-xs text-muted-foreground">
                        Evaluated on{' '}
                        {new Date(selectedEvaluation.evaluated_at).toLocaleDateString()}
                      </p>
                    )}
                  </>
                )}

                {selectedEvaluation.status === 'pending' && (
                  <div className="flex items-start space-x-2 text-muted-foreground bg-muted/50 rounded-xl p-4">
                    <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground mb-1">Awaiting Evaluation</p>
                      <p>
                        Your instructor will review this dish and provide feedback soon.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
