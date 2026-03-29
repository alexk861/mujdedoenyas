import { useState } from 'react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { recentRequests } from '../data/videos';
import PropTypes from 'prop-types';

export default function Request({ data }) {
  const [formData, setFormData] = useState({ name: '', email: '', piece: '', story: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setFormData({ name: '', email: '', piece: '', story: '' });
      toast.success(data.toast);
    }, 1500);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!data) return null;

  const labels = data.formLabels || {};

  const requestSchemas = {
    "@context": "https://schema.org",
    "@graph": recentRequests.map(req => ({
      "@type": "VideoObject",
      "name": req.title,
      "description": `Piano cover of ${req.title} requested by ${req.requestedBy}.`,
      "thumbnailUrl": `https://img.youtube.com/vi/${req.videoId}/mqdefault.jpg`,
      "uploadDate": new Date("2024-01-01").toISOString(),
      "embedUrl": `https://www.youtube.com/embed/${req.videoId}`,
      "publisher": {
        "@type": "Person",
        "name": "Müjde Doenyas",
        "logo": {
          "@type": "ImageObject",
          "url": "https://mujdedoenyas.com/og-image.jpg"
        }
      }
    }))
  };

  return (
    <section className="py-16 bg-surface" id="request">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(requestSchemas)}</script>
      </Helmet>
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <span className="text-primary font-label tracking-[0.2em] uppercase text-xs mb-4 block">{data.subtitle}</span>
            <h2 className="text-4xl md:text-6xl font-headline italic text-on-surface mb-8">{data.title}</h2>
            <p className="text-lg text-on-surface-variant font-light leading-relaxed max-w-md">
              {data.description}
            </p>
            
            <div className="mt-12 hidden lg:block">
              <div className="w-24 h-[1px] bg-primary/30 mb-8"></div>
              <p className="font-serif italic text-on-surface-variant text-sm">
                {data.quote}
              </p>
            </div>
          </div>
          
          <div className="glass-card p-8 md:p-10 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 pointer-events-none"></div>
            
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-xs font-label tracking-widest uppercase text-on-surface-variant mb-2">{labels.name}</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container-high p-3 text-on-surface focus:outline-none focus:bg-surface-container-highest transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-label tracking-widest uppercase text-on-surface-variant mb-2">{labels.email}</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container-high p-3 text-on-surface focus:outline-none focus:bg-surface-container-highest transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="piece" className="block text-xs font-label tracking-widest uppercase text-on-surface-variant mb-2">{labels.piece}</label>
                <input 
                  type="text" 
                  id="piece" 
                  name="piece"
                  value={formData.piece}
                  onChange={handleChange}
                  required
                  placeholder={labels.piecePlaceholder}
                  className="w-full bg-surface-container-high p-3 text-on-surface focus:outline-none focus:bg-surface-container-highest transition-colors placeholder:text-on-surface-variant/30"
                />
              </div>
              
              <div>
                <label htmlFor="story" className="block text-xs font-label tracking-widest uppercase text-on-surface-variant mb-2">{labels.story}</label>
                <textarea 
                  id="story" 
                  name="story"
                  value={formData.story}
                  onChange={handleChange}
                  rows="4"
                  className="w-full bg-surface-container-high p-3 text-on-surface focus:outline-none focus:bg-surface-container-highest transition-colors resize-none"
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary text-on-primary py-4 font-label uppercase tracking-[0.2em] text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-70 flex justify-center items-center"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  data.button
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Fulfilled Requests Feed */}
        <div className="mt-16 pt-12 border-t border-on-surface/10">
          <div className="mb-12">
            <h3 className="text-2xl md:text-3xl font-headline italic text-on-surface mb-4">
              {data.fulfilledTitle}
            </h3>
            <p className="text-on-surface-variant font-light max-w-2xl">
              {data.fulfilledDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentRequests.map((req, index) => (
              <a
                key={index}
                href={`https://www.youtube.com/watch?v=${req.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block border border-on-surface/20 p-6 transition-all duration-300 hover:bg-primary hover:border-primary"
              >
                <div className="relative aspect-video bg-surface-container-high mb-6 overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${req.videoId}/mqdefault.jpg`}
                    alt={req.title}
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-on-surface/10 group-hover:bg-transparent transition-colors duration-500 pointer-events-none"></div>
                </div>

                <div className="flex flex-col h-full">
                  <span className="text-xs font-label tracking-widest text-on-surface-variant uppercase mb-3 group-hover:text-on-primary/70 transition-colors">
                    Requested by {req.requestedBy}
                  </span>
                  <h4 className="text-lg font-serif italic text-on-surface group-hover:text-on-primary transition-colors line-clamp-2">
                    {req.title}
                  </h4>
                  
                  <div className="mt-6 flex items-center text-on-surface-variant text-xs font-label tracking-widest uppercase group-hover:text-on-primary transition-colors">
                    <span>Watch Performance</span>
                    <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

Request.propTypes = {
  data: PropTypes.shape({
    toast: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    quote: PropTypes.string.isRequired,
    button: PropTypes.string.isRequired,
    formLabels: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
      piece: PropTypes.string,
      piecePlaceholder: PropTypes.string,
      story: PropTypes.string,
    }),
    fulfilledTitle: PropTypes.string.isRequired,
    fulfilledDescription: PropTypes.string.isRequired,
  }),
};
