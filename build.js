import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentDir = path.join(__dirname, 'public/content');
const distDir = path.join(__dirname, 'dist');

// Load the HTML layout template
const layoutTemplate = fs.readFileSync(path.join(__dirname, 'layout.html'), 'utf-8');

// Navigation structure with submenus
const navigationStructure = [
  { path: '/', file: 'index.md', title: 'Home' },
  {
    title: 'Over ons',
    children: [
      { path: '/bestuur', file: 'bestuur.md', title: 'Bestuur' },
      { path: '/doel', file: 'doel.md', title: 'Doel' },
      { path: '/lid-worden', file: 'lid-worden.md', title: 'Lid worden' },
    ]
  },
  {
    title: 'Projecten',
    children: [
      { path: '/hartslagnu', file: 'hartslagnu.md', title: 'HartslagNu' },
      { path: '/verkeersveiligheid', file: 'verkeersveiligheid.md', title: 'Verkeersveiligheid' },
      { path: '/energietransitie', file: 'energietransitie.md', title: 'Energietransitie' },
      { path: '/waardevol-brummen', file: 'waardevol-brummen.md', title: 'WaardeVOL Brummen' },
      { path: '/zwerfvuil', file: 'zwerfvuil.md', title: 'Zwerfvuil actie' },
      { path: '/bijenlint', file: 'bijenlint.md', title: 'Bijenlint' },
      { path: '/oekens-ommetje', file: 'oekens-ommetje.md', title: 'Oekens ommetje' },
      { path: '/verhalen-voorstonden', file: 'verhalen-voorstonden.md', title: 'Verhalen Voorstonden' },
    ]
  },
  { path: '/informatiebulletins', file: 'informatiebulletins.md', title: 'Informatiebulletins' },
  { path: '/contact', file: 'contact.md', title: 'Contact' },
];

// Parse front matter using gray-matter
function parseFrontMatter(content) {
  const { data: meta, content: markdownContent } = matter(content);
  return { meta, content: markdownContent };
}

// Get all pages from navigation structure
function getAllPages() {
  const pages = [];
  
  function extractPages(items) {
    for (const item of items) {
      if (item.children) {
        extractPages(item.children);
      } else {
        pages.push(item);
      }
    }
  }
  
  extractPages(navigationStructure);
  return pages;
}

// Check if a path is active (current page or parent of current page)
function isActive(itemPath, currentPath) {
  if (!itemPath) return false;
  return currentPath === itemPath;
}

function isParentActive(children, currentPath) {
  return children.some(child => child.path === currentPath);
}

// Generate navigation HTML
function generateNavigation(currentPath) {
  let html = '';
  
  for (const item of navigationStructure) {
    if (item.children) {
      // Submenu item
      const isParent = isParentActive(item.children, currentPath);
      html += `
            <li class="relative group" x-data="{ open: false }">
              <button 
                @click="open = !open" 
                @mouseenter="open = true"
                class="flex items-center gap-1 px-4 py-3 text-white hover:bg-olive-600/50 transition-colors w-full lg:w-auto ${isParent ? 'bg-olive-600/30' : ''}"
              >
                ${item.title}
                <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <ul 
                x-show="open" 
                @mouseleave="open = false"
                @click.away="open = false"
                x-transition
                class="lg:absolute lg:left-0 lg:top-full bg-olive-600 lg:rounded-b-lg lg:shadow-lg lg:min-w-[200px] z-50"
              >`;
      
      for (const child of item.children) {
        const active = isActive(child.path, currentPath);
        html += `
                <li>
                  <a href="${child.path}.html" class="block px-4 py-2 text-white hover:bg-olive-700/50 transition-colors ${active ? 'bg-olive-700/30 font-medium' : ''}">${child.title}</a>
                </li>`;
      }
      
      html += `
              </ul>
            </li>`;
    } else {
      // Regular menu item
      const active = isActive(item.path, currentPath);
      const href = item.path === '/' ? '/index.html' : `${item.path}.html`;
      html += `
            <li>
              <a href="${href}" class="block px-4 py-3 text-white hover:bg-olive-600/50 transition-colors ${active ? 'bg-olive-600/30 font-medium' : ''}">${item.title}</a>
            </li>`;
    }
  }
  
  return html;
}

// Process a markdown file and return HTML
function processMarkdownFile(filePath, currentPath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { meta, content } = parseFrontMatter(fileContent);
  const htmlContent = marked(content);

  const title = meta.title || 'Wijkraad';
  const navigation = generateNavigation(currentPath);

  return layoutTemplate
    .replace(/\{\{title\}\}/g, title)
    .replace('{{navigation}}', navigation)
    .replace('{{content}}', htmlContent);
}

// Copy static images and media folder from public to dist
function copyStaticAssets() {
  const publicDir = path.join(__dirname, 'public');
  const mediaDir = path.join(__dirname, 'media');

  // Copy images and special files from public
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    files.forEach(file => {
      if (file.match(/\.(png|jpg|jpeg|gif|svg|ico|webmanifest|pdf)$/i) || file === 'CNAME' || file === '.nojekyll') {
        const srcPath = path.join(publicDir, file);
        const destPath = path.join(distDir, file);
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }

  // Copy media folder
  if (fs.existsSync(mediaDir)) {
    const destMediaDir = path.join(distDir, 'media');
    fs.cpSync(mediaDir, destMediaDir, { recursive: true });
  }
}

// Generate HTML files from markdown
function generateSite() {
  // Ensure the dist directory is clean
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir);

  // Copy static assets
  copyStaticAssets();

  // Generate pages
  const pages = getAllPages();
  
  for (const page of pages) {
    const filePath = path.join(contentDir, page.file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: ${page.file} not found, skipping...`);
      continue;
    }
    
    const htmlContent = processMarkdownFile(filePath, page.path);
    const outputFileName = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
    const outputFilePath = path.join(distDir, outputFileName);
    
    fs.writeFileSync(outputFilePath, htmlContent);
    console.log(`Generated: ${outputFileName}`);
  }
  
  console.log('\nBuild complete!');
}

// Run site generation
generateSite();
