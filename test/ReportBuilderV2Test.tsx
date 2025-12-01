/**
 * Test Page for Report Builder v2
 * Access at: http://localhost:3000/test-rb2
 */

import React from 'react';
import { ReportBuilder } from '../src/reportBuilder';

const ReportBuilderV2Test: React.FC = () => {
  return (
    <div className="w-screen h-screen">
      <ReportBuilder />
    </div>
  );
};

export default ReportBuilderV2Test;
