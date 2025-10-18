import React, { useState, useEffect } from 'react';
import { 
  Award, 
  BookOpen, 
  Calendar, 
  ChefHat, 
  Download, 
  Edit, 
  FileText, 
  GraduationCap, 
  MapPin, 
  Medal, 
  Star, 
  Trophy,
  User,
  Briefcase,
  Link as LinkIcon,
  Mail,
  Phone,
  Globe,
  Camera,
  X,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { User as UserType } from '../utils/auth';
import { UserRoleBadge } from './UserRoleBadge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PortfolioProps {
  user: UserType;
  userId?: string; 
  onNavigate: (page: string, id?: string) => void;
}

interface PortfolioData {
  id: string;
  user_id: string;
  bio: string;
  tagline: string;
  specialties: string[];
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  achievements: Achievement[];
  certifications: Certification[];
  contact_info: ContactInfo;
  social_links: SocialLinks;
  created_at: string;
  updated_at: string;
}

interface ExperienceItem {
  id: string;
  title: string;
  organization: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string;
  current: boolean;
}

interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  location: string;
  graduation_date: string;
  description: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: string;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credential_id: string;
}

interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  website: string;
}

interface SocialLinks {
  linkedin: string;
  instagram: string;
  twitter: string;
}

interface Recipe {
  id: string;
  title: string;
  image_url: string | null;
  description: string;
  created_at: string;
  difficulty?: string;
  cooking_time?: number;
  servings?: number;
  rating?: number;
  tags?: string[];
  author_id?: string;
  author_name?: string;
}

export function Portfolio({ user, userId, onNavigate }: PortfolioProps) {
  const viewingUserId = userId || user.id;
  const isOwnProfile = viewingUserId === user.id;
  
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PortfolioData>>({});
  const [viewerUser, setViewerUser] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {

    setIsEditing(false);
    setLoading(true);
    setViewerUser(null);
    setPortfolioData(null);
    setRecipes([]);
    
    fetchPortfolioData();
    fetchRecipes();
    if (!isOwnProfile) {
      fetchViewerUser();
    }
  }, [viewingUserId]);

  const fetchViewerUser = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/${viewingUserId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const { profile } = await response.json();
        if (profile) {
          setViewerUser(profile);
        }
      } else {
        console.error('Failed to fetch viewer user profile');
      }
    } catch (error) {
      console.error('Error fetching viewer user:', error);
    }
  };

  const fetchPortfolioData = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/rest/v1/make_c56dfc7a_portfolios?user_id=eq.${viewingUserId}`,
        {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${user.access_token}`,
          },
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setPortfolioData(data[0]);
        setEditData(data[0]);
      } else if (isOwnProfile) {

        await createDefaultPortfolio();
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPortfolio = async () => {
    const defaultPortfolio = {
      user_id: user.id,
      bio: '',
      tagline: '',
      specialties: [],
      skills: [],
      experience: [],
      education: [],
      achievements: [],
      certifications: [],
      contact_info: {
        email: user.email || '',
        phone: '',
        location: '',
        website: '',
      },
      social_links: {
        linkedin: '',
        instagram: '',
        twitter: '',
      },
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/rest/v1/make_c56dfc7a_portfolios`,
        {
          method: 'POST',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(defaultPortfolio),
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        setPortfolioData(data[0]);
        setEditData(data[0]);
      }
    } catch (error) {
      console.error('Error creating portfolio:', error);
    }
  };

  const fetchRecipes = async () => {
    try {

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/feed`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (response.ok) {
        const { posts } = await response.json();
        

        const userRecipePosts = (posts || [])
          .filter((post: any) => 
            post.type === 'recipe' && 
            post.author_id === viewingUserId
          )
          .slice(0, 6);
        

        const recipeData = userRecipePosts.map((post: any) => ({
          id: post.id,
          title: post.recipe_data?.title || 'Untitled Recipe',
          description: post.content,
          difficulty: post.recipe_data?.difficulty || 'Medium',
          cooking_time: post.recipe_data?.cooking_time || 30,
          servings: post.recipe_data?.servings || 2,
          image_url: post.images?.[0] || null,
          author_id: post.author_id,
          author_name: post.author_name,
          rating: post.recipe_data?.rating || 0,
          tags: post.recipe_data?.tags || [],
          created_at: post.created_at,
        }));
        
        setRecipes(recipeData);
      } else {
        console.warn('Failed to fetch feed posts for recipes');
        setRecipes([]);
      }
    } catch (error) {
      console.error('Error fetching recipes from feed:', error);
      setRecipes([]);
    }
  };

  const handleSavePortfolio = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/rest/v1/make_c56dfc7a_portfolios?id=eq.${portfolioData?.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            ...editData,
            updated_at: new Date().toISOString(),
          }),
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        setPortfolioData(data[0]);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving portfolio:', error);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    
    try {
      const element = document.getElementById('portfolio-content');
      if (!element) {
        console.error('Portfolio content element not found');
        alert('Error: Portfolio content not found. Please try again.');
        setExporting(false);
        return;
      }


      const clonedElement = element.cloneNode(true) as HTMLElement;
      

      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        top: -10000px;
        left: 0;
        width: ${element.offsetWidth}px;
        background-color: rgb(255, 255, 255);
        padding: 20px;
      `;
      container.appendChild(clonedElement);
      document.body.appendChild(container);


      const replaceWithInlineStyles = (elem: HTMLElement) => {

        if (elem.classList.contains('bg-card')) {
          elem.style.backgroundColor = 'rgb(255, 255, 255)';
        }
        if (elem.classList.contains('bg-secondary')) {
          elem.style.backgroundColor = 'rgb(219, 234, 254)';
        }
        if (elem.classList.contains('bg-background')) {
          elem.style.backgroundColor = 'rgb(248, 250, 252)';
        }
        if (elem.classList.contains('bg-primary/10') || elem.className.match(/bg-primary\/10/)) {
          elem.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
        }
        if (elem.classList.contains('bg-primary/5') || elem.className.match(/bg-primary\/5/)) {
          elem.style.backgroundColor = 'rgba(220, 38, 38, 0.05)';
        }
        if (elem.classList.contains('bg-accent/5') || elem.className.match(/bg-accent\/5/)) {
          elem.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
        }
        

        if (elem.classList.contains('text-foreground')) {
          elem.style.color = 'rgb(26, 31, 46)';
        }
        if (elem.classList.contains('text-muted-foreground')) {
          elem.style.color = 'rgb(100, 116, 139)';
        }
        if (elem.classList.contains('text-primary')) {
          elem.style.color = 'rgb(220, 38, 38)';
        }
        if (elem.classList.contains('text-white')) {
          elem.style.color = 'rgb(255, 255, 255)';
        }
        

        if (elem.classList.contains('border-border') || elem.classList.contains('border')) {
          elem.style.borderColor = 'rgb(226, 232, 240)';
        }
        

        if (elem.classList.contains('bg-gradient-to-br') || elem.classList.contains('gradient') || elem.className.match(/gradient/)) {
          elem.style.background = 'rgba(220, 38, 38, 0.05)';
          elem.style.backgroundImage = 'none';
        }
        
        if (elem.classList.contains('avatar-gradient')) {
          elem.style.background = 'rgb(220, 38, 38)';
          elem.style.backgroundImage = 'none';
        }
        

        const classesToRemove = Array.from(elem.classList).filter(cls => 
          cls.includes('bg-') || 
          cls.includes('text-') || 
          cls.includes('border-') ||
          cls.includes('from-') ||
          cls.includes('to-') ||
          cls.includes('via-') ||
          cls.includes('gradient')
        );
        classesToRemove.forEach(cls => elem.classList.remove(cls));
        

        Array.from(elem.children).forEach(child => {
          if (child instanceof HTMLElement) {
            replaceWithInlineStyles(child);
          }
        });
      };


      replaceWithInlineStyles(clonedElement);


      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 0,
      });


      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${viewerUser?.name || user.name}_Portfolio.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const displayUser = viewerUser || user;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header Actions */}
      <div className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            {isOwnProfile ? 'My Portfolio' : `${displayUser.name}'s Portfolio`}
          </h1>
          <div className="flex items-center gap-3">
            {isOwnProfile && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Portfolio
              </button>
            )}
            {isOwnProfile && isEditing && (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(portfolioData || {});
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSavePortfolio}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            )}
            {!isEditing && (
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                title="Export portfolio as PDF"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Content */}
      <div id="portfolio-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-border overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Avatar */}
              <div className="w-32 h-32 avatar-gradient rounded-2xl flex items-center justify-center overflow-hidden shadow-xl flex-shrink-0">
                {displayUser.avatar_url ? (
                  <ImageWithFallback
                    src={displayUser.avatar_url}
                    alt={displayUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-4xl font-bold">
                    {displayUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-foreground">{displayUser.name}</h2>
                  <UserRoleBadge role={displayUser.role} />
                </div>
                
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.tagline || ''}
                    onChange={(e) => setEditData({ ...editData, tagline: e.target.value })}
                    className="input-clean w-full mb-3"
                    placeholder="Your professional tagline (e.g., 'Passionate Pastry Chef')"
                  />
                ) : (
                  portfolioData?.tagline && (
                    <p className="text-xl text-muted-foreground mb-3">{portfolioData.tagline}</p>
                  )
                )}

                {isEditing ? (
                  <textarea
                    value={editData.bio || ''}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    className="input-clean w-full min-h-[100px]"
                    placeholder="Write a compelling bio about yourself..."
                  />
                ) : (
                  portfolioData?.bio && (
                    <p className="text-muted-foreground leading-relaxed">{portfolioData.bio}</p>
                  )
                )}
              </div>
            </div>

            {/* Contact Info */}
            {portfolioData?.contact_info && (
              <div className="mt-6 pt-6 border-t border-border/50 flex flex-wrap gap-4">
                {portfolioData.contact_info.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{portfolioData.contact_info.email}</span>
                  </div>
                )}
                {portfolioData.contact_info.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{portfolioData.contact_info.location}</span>
                  </div>
                )}
                {portfolioData.contact_info.website && (
                  <a
                    href={portfolioData.contact_info.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Specialties & Skills */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Specialties */}
          <PortfolioSection
            title="Culinary Specialties"
            icon={<ChefHat className="w-5 h-5" />}
            isEditing={isEditing}
            items={isEditing ? editData.specialties : portfolioData?.specialties}
            onItemsChange={(items) => setEditData({ ...editData, specialties: items as string[] })}
            emptyMessage="No specialties added yet"
          />

          {/* Skills */}
          <PortfolioSection
            title="Skills & Techniques"
            icon={<Star className="w-5 h-5" />}
            isEditing={isEditing}
            items={isEditing ? editData.skills : portfolioData?.skills}
            onItemsChange={(items) => setEditData({ ...editData, skills: items as string[] })}
            emptyMessage="No skills added yet"
          />
        </div>

        {/* Culinary Creations */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Culinary Creations</h3>
          </div>

          {recipes.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  className="group bg-secondary rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 text-left"
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
                    {recipe.image_url ? (
                      <ImageWithFallback
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-foreground mb-1 line-clamp-1">{recipe.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No culinary creations yet</p>
            </div>
          )}
        </div>

        {/* Experience */}
        <ExperienceSection
          isEditing={isEditing}
          experience={isEditing ? editData.experience : portfolioData?.experience}
          onExperienceChange={(exp) => setEditData({ ...editData, experience: exp as ExperienceItem[] })}
        />

        {/* Education */}
        <EducationSection
          isEditing={isEditing}
          education={isEditing ? editData.education : portfolioData?.education}
          onEducationChange={(edu) => setEditData({ ...editData, education: edu as EducationItem[] })}
        />

        {/* Achievements */}
        <AchievementsSection
          isEditing={isEditing}
          achievements={isEditing ? editData.achievements : portfolioData?.achievements}
          onAchievementsChange={(ach) => setEditData({ ...editData, achievements: ach as Achievement[] })}
        />

        {/* Certifications */}
        <CertificationsSection
          isEditing={isEditing}
          certifications={isEditing ? editData.certifications : portfolioData?.certifications}
          onCertificationsChange={(cert) => setEditData({ ...editData, certifications: cert as Certification[] })}
        />
      </div>
    </div>
  );
}

// Portfolio Section Component (for Skills and Specialties)
function PortfolioSection({ title, icon, isEditing, items = [], onItemsChange, emptyMessage }: any) {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      onItemsChange([...(items || []), newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...(items || [])];
    updated.splice(index, 1);
    onItemsChange(updated);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
      </div>

      {isEditing && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            className="input-clean flex-1"
            placeholder="Add new item..."
          />
          <button
            onClick={handleAddItem}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item: string, index: number) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg"
            >
              <span>{item}</span>
              {isEditing && (
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isEditing && (
          <p className="text-muted-foreground text-center py-4">{emptyMessage}</p>
        )
      )}
    </div>
  );
}

// Experience Section Component
function ExperienceSection({ isEditing, experience = [], onExperienceChange }: any) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newExp, setNewExp] = useState<Partial<ExperienceItem>>({
    id: '',
    title: '',
    organization: '',
    location: '',
    start_date: '',
    end_date: '',
    description: '',
    current: false,
  });

  const handleAddExperience = () => {
    if (newExp.title && newExp.organization) {
      onExperienceChange([...(experience || []), { ...newExp, id: Date.now().toString() }]);
      setNewExp({
        id: '',
        title: '',
        organization: '',
        location: '',
        start_date: '',
        end_date: '',
        description: '',
        current: false,
      });
      setIsAddingNew(false);
    }
  };

  const handleRemoveExperience = (id: string) => {
    onExperienceChange((experience || []).filter((exp: ExperienceItem) => exp.id !== id));
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Experience</h3>
        </div>
        {isEditing && !isAddingNew && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Experience
          </button>
        )}
      </div>

      {isAddingNew && (
        <div className="mb-6 p-4 bg-secondary rounded-xl space-y-3">
          <input
            type="text"
            value={newExp.title || ''}
            onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
            className="input-clean w-full"
            placeholder="Job Title"
          />
          <input
            type="text"
            value={newExp.organization || ''}
            onChange={(e) => setNewExp({ ...newExp, organization: e.target.value })}
            className="input-clean w-full"
            placeholder="Organization/Restaurant"
          />
          <input
            type="text"
            value={newExp.location || ''}
            onChange={(e) => setNewExp({ ...newExp, location: e.target.value })}
            className="input-clean w-full"
            placeholder="Location"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="month"
              value={newExp.start_date || ''}
              onChange={(e) => setNewExp({ ...newExp, start_date: e.target.value })}
              className="input-clean w-full"
              placeholder="Start Date"
            />
            {!newExp.current && (
              <input
                type="month"
                value={newExp.end_date || ''}
                onChange={(e) => setNewExp({ ...newExp, end_date: e.target.value })}
                className="input-clean w-full"
                placeholder="End Date"
              />
            )}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newExp.current || false}
              onChange={(e) => setNewExp({ ...newExp, current: e.target.checked, end_date: '' })}
              className="rounded"
            />
            <span className="text-sm text-foreground">Currently working here</span>
          </label>
          <textarea
            value={newExp.description || ''}
            onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
            className="input-clean w-full min-h-[80px]"
            placeholder="Description of your role and achievements..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddExperience}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Save
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {experience && experience.length > 0 ? (
        <div className="space-y-4">
          {experience.map((exp: ExperienceItem) => (
            <div key={exp.id} className="p-4 bg-secondary rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-foreground">{exp.title}</h4>
                  <p className="text-sm text-muted-foreground">{exp.organization}</p>
                </div>
                {isEditing && (
                  <button
                    onClick={() => handleRemoveExperience(exp.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {exp.location && (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span>{exp.location}</span>
                    <span>•</span>
                  </>
                )}
                <Calendar className="w-4 h-4" />
                <span>
                  {exp.start_date} - {exp.current ? 'Present' : exp.end_date}
                </span>
              </div>
              {exp.description && (
                <p className="text-sm text-foreground">{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isEditing && (
          <p className="text-muted-foreground text-center py-8">No experience added yet</p>
        )
      )}
    </div>
  );
}

// Education Section Component
function EducationSection({ isEditing, education = [], onEducationChange }: any) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEdu, setNewEdu] = useState<Partial<EducationItem>>({
    id: '',
    degree: '',
    institution: '',
    location: '',
    graduation_date: '',
    description: '',
  });

  const handleAddEducation = () => {
    if (newEdu.degree && newEdu.institution) {
      onEducationChange([...(education || []), { ...newEdu, id: Date.now().toString() }]);
      setNewEdu({
        id: '',
        degree: '',
        institution: '',
        location: '',
        graduation_date: '',
        description: '',
      });
      setIsAddingNew(false);
    }
  };

  const handleRemoveEducation = (id: string) => {
    onEducationChange((education || []).filter((edu: EducationItem) => edu.id !== id));
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Education</h3>
        </div>
        {isEditing && !isAddingNew && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Education
          </button>
        )}
      </div>

      {isAddingNew && (
        <div className="mb-6 p-4 bg-secondary rounded-xl space-y-3">
          <input
            type="text"
            value={newEdu.degree || ''}
            onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
            className="input-clean w-full"
            placeholder="Degree/Certificate"
          />
          <input
            type="text"
            value={newEdu.institution || ''}
            onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
            className="input-clean w-full"
            placeholder="Institution"
          />
          <input
            type="text"
            value={newEdu.location || ''}
            onChange={(e) => setNewEdu({ ...newEdu, location: e.target.value })}
            className="input-clean w-full"
            placeholder="Location"
          />
          <input
            type="month"
            value={newEdu.graduation_date || ''}
            onChange={(e) => setNewEdu({ ...newEdu, graduation_date: e.target.value })}
            className="input-clean w-full"
            placeholder="Graduation Date"
          />
          <textarea
            value={newEdu.description || ''}
            onChange={(e) => setNewEdu({ ...newEdu, description: e.target.value })}
            className="input-clean w-full min-h-[60px]"
            placeholder="Additional details..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddEducation}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Save
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {education && education.length > 0 ? (
        <div className="space-y-4">
          {education.map((edu: EducationItem) => (
            <div key={edu.id} className="p-4 bg-secondary rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-foreground">{edu.degree}</h4>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                </div>
                {isEditing && (
                  <button
                    onClick={() => handleRemoveEducation(edu.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {edu.location && (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span>{edu.location}</span>
                    <span>•</span>
                  </>
                )}
                {edu.graduation_date && (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>{edu.graduation_date}</span>
                  </>
                )}
              </div>
              {edu.description && (
                <p className="text-sm text-foreground">{edu.description}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isEditing && (
          <p className="text-muted-foreground text-center py-8">No education added yet</p>
        )
      )}
    </div>
  );
}

// Achievements Section Component
function AchievementsSection({ isEditing, achievements = [], onAchievementsChange }: any) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAch, setNewAch] = useState<Partial<Achievement>>({
    id: '',
    title: '',
    description: '',
    date: '',
    icon: 'trophy',
  });

  const iconOptions = [
    { value: 'trophy', icon: Trophy, label: 'Trophy' },
    { value: 'medal', icon: Medal, label: 'Medal' },
    { value: 'award', icon: Award, label: 'Award' },
    { value: 'star', icon: Star, label: 'Star' },
  ];

  const handleAddAchievement = () => {
    if (newAch.title) {
      onAchievementsChange([...(achievements || []), { ...newAch, id: Date.now().toString() }]);
      setNewAch({ id: '', title: '', description: '', date: '', icon: 'trophy' });
      setIsAddingNew(false);
    }
  };

  const handleRemoveAchievement = (id: string) => {
    onAchievementsChange((achievements || []).filter((ach: Achievement) => ach.id !== id));
  };

  const getIcon = (iconName: string) => {
    const iconOption = iconOptions.find((opt) => opt.value === iconName);
    return iconOption ? <iconOption.icon className="w-5 h-5" /> : <Trophy className="w-5 h-5" />;
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Achievements & Awards</h3>
        </div>
        {isEditing && !isAddingNew && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Achievement
          </button>
        )}
      </div>

      {isAddingNew && (
        <div className="mb-6 p-4 bg-secondary rounded-xl space-y-3">
          <input
            type="text"
            value={newAch.title || ''}
            onChange={(e) => setNewAch({ ...newAch, title: e.target.value })}
            className="input-clean w-full"
            placeholder="Achievement Title"
          />
          <textarea
            value={newAch.description || ''}
            onChange={(e) => setNewAch({ ...newAch, description: e.target.value })}
            className="input-clean w-full min-h-[60px]"
            placeholder="Description..."
          />
          <input
            type="month"
            value={newAch.date || ''}
            onChange={(e) => setNewAch({ ...newAch, date: e.target.value })}
            className="input-clean w-full"
            placeholder="Date"
          />
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="flex gap-2">
              {iconOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNewAch({ ...newAch, icon: option.value })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    newAch.icon === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <option.icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddAchievement}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Save
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {achievements && achievements.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {achievements.map((ach: Achievement) => (
            <div key={ach.id} className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                  {getIcon(ach.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-foreground">{ach.title}</h4>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveAchievement(ach.id)}
                        className="text-destructive hover:text-destructive/80 ml-2 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {ach.description && (
                    <p className="text-sm text-muted-foreground mb-2">{ach.description}</p>
                  )}
                  {ach.date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{ach.date}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isEditing && (
          <p className="text-muted-foreground text-center py-8">No achievements added yet</p>
        )
      )}
    </div>
  );
}

// Certifications Section Component
function CertificationsSection({ isEditing, certifications = [], onCertificationsChange }: any) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCert, setNewCert] = useState<Partial<Certification>>({
    id: '',
    name: '',
    issuer: '',
    date: '',
    credential_id: '',
  });

  const handleAddCertification = () => {
    if (newCert.name && newCert.issuer) {
      onCertificationsChange([...(certifications || []), { ...newCert, id: Date.now().toString() }]);
      setNewCert({ id: '', name: '', issuer: '', date: '', credential_id: '' });
      setIsAddingNew(false);
    }
  };

  const handleRemoveCertification = (id: string) => {
    onCertificationsChange((certifications || []).filter((cert: Certification) => cert.id !== id));
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Certifications</h3>
        </div>
        {isEditing && !isAddingNew && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        )}
      </div>

      {isAddingNew && (
        <div className="mb-6 p-4 bg-secondary rounded-xl space-y-3">
          <input
            type="text"
            value={newCert.name || ''}
            onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
            className="input-clean w-full"
            placeholder="Certification Name"
          />
          <input
            type="text"
            value={newCert.issuer || ''}
            onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
            className="input-clean w-full"
            placeholder="Issuing Organization"
          />
          <input
            type="month"
            value={newCert.date || ''}
            onChange={(e) => setNewCert({ ...newCert, date: e.target.value })}
            className="input-clean w-full"
            placeholder="Issue Date"
          />
          <input
            type="text"
            value={newCert.credential_id || ''}
            onChange={(e) => setNewCert({ ...newCert, credential_id: e.target.value })}
            className="input-clean w-full"
            placeholder="Credential ID (optional)"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddCertification}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Save
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {certifications && certifications.length > 0 ? (
        <div className="space-y-3">
          {certifications.map((cert: Certification) => (
            <div key={cert.id} className="p-4 bg-secondary rounded-xl flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-foreground mb-1">{cert.name}</h4>
                <p className="text-sm text-muted-foreground mb-1">{cert.issuer}</p>
                {cert.date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{cert.date}</span>
                  </div>
                )}
                {cert.credential_id && (
                  <p className="text-xs text-muted-foreground mt-1">ID: {cert.credential_id}</p>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => handleRemoveCertification(cert.id)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isEditing && (
          <p className="text-muted-foreground text-center py-8">No certifications added yet</p>
        )
      )}
    </div>
  );
}