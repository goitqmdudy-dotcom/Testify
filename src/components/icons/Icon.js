import React from 'react';
import './Icon.css';

import calendarIcon from './3dicons-calender-dynamic-color.png';
import computerIcon from './3dicons-computer-dynamic-color.png';
import copyIcon from './3dicons-copy-dynamic-color.png';
import fileTextIcon from './3dicons-file-text-dynamic-color.png';
import fireIcon from './3dicons-fire-dynamic-color.png';
import girlIcon from './3dicons-girl-dynamic-color.png';
import mailIcon from './3dicons-mail-dynamic-color.png';
import notebookIcon from './3dicons-notebook-dynamic-color.png';
import shieldIcon from './3dicons-shield-dynamic-color.png';
import targetIcon from './3dicons-target-dynamic-color.png';
import thumbUpIcon from './3dicons-thumb-up-dynamic-color.png';
import firstPlaceIcon from './1st-place.png';
import secondPlaceIcon from './2nd-place.png';
import thirdPlaceIcon from './3rd-place.png';
import leaderboardIcon from './leaderboard.png';

const iconMap = {
  'document': fileTextIcon,
  'paper': fileTextIcon,
  'file': fileTextIcon,
  'text': fileTextIcon,
  
  'chart': computerIcon,
  'submissions': computerIcon,
  'analytics': computerIcon,
  'data': computerIcon,
  
  'copy': copyIcon,
  'duplicate': copyIcon,
  
  'calendar': calendarIcon,
  'schedule': calendarIcon,
  'date': calendarIcon,
  
  'success': thumbUpIcon,
  'approve': thumbUpIcon,
  'like': thumbUpIcon,
  'correct': thumbUpIcon,
  
  'shield': shieldIcon,
  'security': shieldIcon,
  'admin': shieldIcon,
  'protect': shieldIcon,
  
  'target': targetIcon,
  'goal': targetIcon,
  'performance': targetIcon,
  'score': targetIcon,
  
  'mail': mailIcon,
  'email': mailIcon,
  'message': mailIcon,
  'notification': mailIcon,
  
  'notebook': notebookIcon,
  'learn': notebookIcon,
  'education': notebookIcon,
  'study': notebookIcon,
  
  'fire': fireIcon,
  'energy': fireIcon,
  'active': fireIcon,
  'hot': fireIcon,
  
  'user': girlIcon,
  'profile': girlIcon,
  'candidate': girlIcon,
  'person': girlIcon,
  
  'first': firstPlaceIcon,
  '1st': firstPlaceIcon,
  'gold': firstPlaceIcon,
  'winner': firstPlaceIcon,
  'first-place': firstPlaceIcon,
  
  'second': secondPlaceIcon,
  '2nd': secondPlaceIcon,
  'silver': secondPlaceIcon,
  'second-place': secondPlaceIcon,
  
  'third': thirdPlaceIcon,
  '3rd': thirdPlaceIcon,
  'bronze': thirdPlaceIcon,
  'third-place': thirdPlaceIcon,
  
  'leaderboard': leaderboardIcon,
  'ranking': leaderboardIcon,
  'standings': leaderboardIcon,
  'scoreboard': leaderboardIcon,
};

const Icon = ({ 
  name, 
  size = 'medium', 
  className = '', 
  alt = '', 
  style = {} 
}) => {
  const iconSrc = iconMap[name];
  
  if (!iconSrc) {
    return null;
  }
  
  const sizeClass = `icon-${size}`;
  const classes = `icon ${sizeClass} ${className}`.trim();
  
  return (
    <img 
      src={iconSrc} 
      alt={alt || `${name} icon`}
      className={classes}
      style={style}
    />
  );
};

export default Icon;
