import PropTypes from 'prop-types';

export default function Hero({ data }) {
  return (
    <section className="relative h-[921px] flex items-center overflow-hidden" id="stage">
      <div className="absolute inset-0 z-0">
        <img 
          className="w-full h-full object-cover opacity-60 scale-105" 
          alt="pianist playing in salon" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhp5jRt3i0xzAc5labtIDyUMcGpvjopkUdEVzvZhmu6INswYdlhGccvr0ZjCIXMQKQHa8iaHZ0xQNWYLo169BtaP6hbdhKEomWTxVCYtqPwCkCsG2uyHO17NlCbxcHwRo5MndBzEBZBqTRstMzuS29U-IKE6U5hkHvnm_NPnGAWox6FzZWh-F4vPFKaBFZPHFAPKqidzQMkL7Hab-2PH1Svm96YRln7HBcwVtwOJqfABAI76yUGsq96-w90rpva4AoK2nIItk8ptE"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"></div>
      </div>
      <div className="container mx-auto px-8 relative z-10">
        <div className="max-w-3xl">
          <span className="text-primary font-label tracking-[0.3em] uppercase text-xs mb-4 block">{data.subtitle}</span>
          <h1 className="text-6xl md:text-8xl font-headline font-bold text-on-surface leading-[1.1] mb-8 tracking-tighter">
            {data.title} <span className="text-primary italic">{data.highlight}</span>
          </h1>
          <p className="text-xl md:text-2xl font-body text-on-surface-variant max-w-xl font-light leading-relaxed">
            {data.description}
          </p>
        </div>
      </div>
      <div className="absolute bottom-12 right-12 hidden md:block">
        <div className="flex items-center gap-4 text-primary">
          <span className="w-24 h-[1px] bg-primary"></span>
          <span className="font-label uppercase text-[10px] tracking-widest">{data.scroll}</span>
        </div>
      </div>
    </section>
  );
}

Hero.propTypes = {
  data: PropTypes.shape({
    subtitle: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    highlight: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    scroll: PropTypes.string.isRequired,
  }).isRequired,
};
