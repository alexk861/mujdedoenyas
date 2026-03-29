import { useState } from 'react';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

export default function Choice({ data }) {
  const [selectedId, setSelectedId] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = (id) => {
    setSelectedId(id);
    setHasVoted(true);
    toast.success(data.toast);
  };

  if (!data) return null;

  return (
    <section className="py-16 bg-surface-container relative" id="choice">
      <div className="absolute inset-0 shimmer-bg opacity-30 pointer-events-none"></div>
      <div className="container mx-auto px-8 max-w-4xl relative z-10">
        <div className="text-center mb-16">
          <span className="text-primary font-label tracking-[0.2em] uppercase text-xs mb-4 block">{data.subtitle}</span>
          <h2 className="text-4xl md:text-5xl font-headline italic text-on-surface mb-4">{data.title}</h2>
          <p className="text-on-surface-variant max-w-xl mx-auto font-light">
            {data.description}
          </p>
        </div>

        <div className="space-y-4">
          {data.options.map((option) => (
            <div 
              key={option.id}
              onClick={() => !hasVoted && handleVote(option.id)}
              className={`glass-card p-6 relative overflow-hidden transition-all duration-500 cursor-pointer ${
                hasVoted 
                  ? selectedId === option.id 
                    ? 'bg-surface-container-highest' 
                    : 'opacity-60 grayscale-[50%]'
                  : 'hover:bg-surface-container-high hover:-translate-y-1'
              }`}
            >
              {hasVoted && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-1000 ease-out"
                  style={{ width: `${option.percentage}%` }}
                ></div>
              )}
              
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-label uppercase tracking-widest text-primary mb-1 block">{option.category}</span>
                  <h3 className="text-xl font-semibold text-on-surface">{option.title}</h3>
                </div>
                
                {hasVoted ? (
                  <span className="text-2xl font-light text-primary font-serif">
                    {option.percentage}%
                  </span>
                ) : (
                  <div className={`w-6 h-6 flex items-center justify-center transition-colors ${selectedId === option.id ? 'bg-primary' : 'bg-surface-container-high'}`}>
                    {selectedId === option.id && <div className="w-2.5 h-2.5 bg-on-primary"></div>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Choice.propTypes = {
  data: PropTypes.shape({
    toast: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      category: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      percentage: PropTypes.number.isRequired,
    })).isRequired,
  }),
};
