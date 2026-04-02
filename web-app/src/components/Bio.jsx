import { Sparkles } from 'lucide-react';
import PropTypes from 'prop-types';

export default function Bio({ data }) {
  return (
    <section className="py-16 bg-surface-container-low relative overflow-hidden">
      <div className="container mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
          <div className="md:col-span-5 relative">
            <div className="aspect-[4/5] overflow-hidden">
              <img 
                className="w-full h-full object-cover" 
                alt="hands on piano keys" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8Nx-fODdzmQ44mRJd-m-B60DRe-FkXlGmZIJnXIkhcuQvWkqNs0u9ltWkbZc4VixBt8BNwfUOkxFEdLLrzOEc1WshcLLex9MxqkrsqkGbbCqj38mzOGK7fNzabwt6F0F_okbZlAxAl8DwUelV_sA2EU6rhQzN4_g_VB8Cu3HJXnngtV_vcz9ClP1IpmF5UkftV8LLWfxcFdJ87kaUTGra6dJicvSe0SsaxKw-gKi-XV2WIptl5X_QdaaXYMswha1yYmErtD4XsUc"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-primary/10 backdrop-blur-3xl -z-10"></div>
          </div>
          <div className="md:col-span-7 flex flex-col gap-8">
            <h2 className="text-4xl md:text-5xl font-headline italic text-on-surface">{data.title}</h2>
            <div className="space-y-6 text-lg text-on-surface-variant font-light leading-relaxed">
              {data.content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <div className="pt-4">
              <Sparkles className="text-primary w-10 h-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Bio.propTypes = {
  data: PropTypes.shape({
    title: PropTypes.string.isRequired,
    content: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
};
