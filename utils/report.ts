
import { Project, ReportSlide } from '../types';

export const generatePowerPoint = async (project: Project, dashboardElement: HTMLElement, activeFiltersStr: string = '') => {
  if (!window.PptxGenJS || !window.html2canvas) {
    alert("Export libraries are not fully loaded. Please refresh the page.");
    return;
  }

  const pptx = new window.PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'RealData Intelligence';
  pptx.company = 'RealData Agency';
  pptx.title = project.name;

  // --- Slide 1: Title Slide ---
  let slide = pptx.addSlide();
  
  // Background accent
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.15, fill: '0047BA' }); // Top bar

  slide.addText('Social Listening Report', { 
      x: 0.5, y: 1.5, w: '90%', fontSize: 14, color: '666666', bold: true, align: 'left' 
  });
  
  slide.addText(project.name, { 
      x: 0.5, y: 2.0, w: '90%', fontSize: 44, bold: true, color: '003366', align: 'left' 
  });

  if (activeFiltersStr) {
    slide.addText(`Filters Applied: ${activeFiltersStr}`, { 
        x: 0.5, y: 3.0, w: '90%', fontSize: 12, color: 'E07A5F', italic: true 
    });
  }

  slide.addText(`Generated on: ${new Date().toLocaleDateString()}`, { 
      x: 0.5, y: 5.0, fontSize: 12, color: '888888' 
  });

  slide.addText(project.description || '', { 
      x: 0.5, y: 3.5, w: '80%', fontSize: 16, color: '444444' 
  });

  // --- Processing Charts ---
  // We identify widgets by a specific class name 'report-widget' added in Analytics.tsx
  const widgets = dashboardElement.querySelectorAll('.report-widget');
  
  for (let i = 0; i < widgets.length; i++) {
    const widgetEl = widgets[i] as HTMLElement;
    
    // Extract metadata
    const titleEl = widgetEl.querySelector('.widget-title');
    const title = titleEl?.textContent || `Chart ${i + 1}`;
    
    const metaEl = widgetEl.querySelector('.widget-meta');
    const meta = metaEl?.textContent || '';

    try {
        // Use html2canvas to take a screenshot of the widget
        // Scale 2 for better retina quality in PPT
        const canvas = await window.html2canvas(widgetEl, { 
            scale: 2, 
            useCORS: true,
            backgroundColor: '#ffffff' // Ensure white background
        });
        const imgData = canvas.toDataURL('image/png');

        // Add new Slide
        const slide = pptx.addSlide();
        
        // Slide Header
        slide.addText(title, { x: 0.5, y: 0.4, fontSize: 24, bold: true, color: '333333' });
        slide.addShape(pptx.ShapeType.line, { x: 0.5, y: 0.9, w: '90%', h: 0, line: { color: '0047BA', width: 2 } });
        
        // Slide Metadata
        if(meta) {
             slide.addText(meta, { x: 0.5, y: 1.0, fontSize: 11, color: '888888', italic: true });
        }

        // Add Image
        slide.addImage({ 
            data: imgData, 
            x: 0.5, 
            y: 1.3, 
            w: 9.0, 
            h: 4.0, 
            sizing: { type: 'contain', w: 9.0, h: 4.0 } 
        });

        // Footer
        slide.addText('RealData Intelligence', { x: 8.5, y: 5.3, fontSize: 10, color: 'CCCCCC' });

    } catch (e) {
        console.error(`Failed to capture widget index ${i}`, e);
    }
  }

  pptx.writeFile({ fileName: `${project.name}_Report_${new Date().toISOString().slice(0,10)}.pptx` });
};

// Phase 5: Custom Report Generation from Canvas
export const generateCustomReport = async (
  project: Project,
  slides: ReportSlide[],
  canvasWidth: number,
  canvasHeight: number,
  renderSlide?: (slide: ReportSlide) => Promise<string | null>
) => {
  if (!window.PptxGenJS || !window.html2canvas) {
    alert("Export libraries not loaded.");
    return;
  }

  const pptx = new window.PptxGenJS();
  pptx.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches
  const PPT_WIDTH_INCH = 10;
  const PPT_HEIGHT_INCH = 5.625;

  for (const slideData of slides) {
      const slide = pptx.addSlide();

      // 1. Background
      if (slideData.background) {
          slide.addImage({ 
              data: slideData.background, 
              x: 0, y: 0, w: '100%', h: '100%' 
          });
      }

      // Prefer a consumer-provided renderer so every slide is captured even when not mounted
      let slideImage: string | null = null;
      if (renderSlide) {
          slideImage = await renderSlide(slideData);
      }

      // Fallback to element-level capture when renderer is not available
      if (slideImage) {
          slide.addImage({ data: slideImage, x: 0, y: 0, w: PPT_WIDTH_INCH, h: PPT_HEIGHT_INCH });
      } else {
          for (const el of slideData.elements) {
              const domId = `element-${el.id}`;
              const domEl = document.getElementById(domId);

              if (domEl) {
                  try {
                      const canvas = await window.html2canvas(domEl, {
                          scale: 2,
                          useCORS: true,
                          backgroundColor: null // Transparent background
                      });
                      const imgData = canvas.toDataURL('image/png');

                      const xPercent = el.x / canvasWidth;
                      const yPercent = el.y / canvasHeight;
                      const wPercent = el.w / canvasWidth;
                      const hPercent = el.h / canvasHeight;

                      slide.addImage({
                          data: imgData,
                          x: xPercent * PPT_WIDTH_INCH,
                          y: yPercent * PPT_HEIGHT_INCH,
                          w: wPercent * PPT_WIDTH_INCH,
                          h: hPercent * PPT_HEIGHT_INCH
                      });

                  } catch (e) {
                      console.error("Failed to capture element", e);
                  }
              }
          }
      }
  }

  pptx.writeFile({ fileName: `${project.name}_CustomReport.pptx` });
};