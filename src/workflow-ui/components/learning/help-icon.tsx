'use client';

import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { HelpCircle } from 'lucide-react';
import type { HelpTopic } from '@/types/learning';

interface HelpIconProps {
  topic: HelpTopic;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function HelpIcon({ topic, side = 'top', align = 'center', className = '' }: HelpIconProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${className}`}
          aria-label={`Help: ${topic.title}`}
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={5}
          className="z-50 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">{topic.title}</h3>

            <div className="text-sm text-gray-700 space-y-2">
              <p>{topic.content}</p>

              {topic.examples && topic.examples.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-gray-900 mb-1">Examples:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {topic.examples.map((example, index) => (
                      <li key={index} className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {topic.links && topic.links.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="font-medium text-gray-900 mb-1">Learn more:</p>
                  <ul className="space-y-1">
                    {topic.links.map((link, index) => (
                      <li key={index}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs underline"
                        >
                          {link.text} →
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
