// src/utils/scamAnalyzer.ts
import type { ScamAnalysisResult, RiskLevel } from '../types';
import { SCAM_KEYWORDS, SUSPICIOUS_DOMAINS } from '../types';

export class ScamAnalyzer {
  private static readonly URGENCY_PATTERNS = [
    /within \d+ (hour|minute|day)s?/i,
    /expires? (today|tomorrow)/i,
    /immediate(ly)?/i,
    /asap/i
  ];

  private static readonly MONEY_PATTERNS = [
    /send .*(\$|₹|rs\.?)\s*\d+/i,
    /transfer.*money/i,
    /pay.*fee/i,
    /deposit.*amount/i
  ];

  private static readonly SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf'];

  public static analyze(text: string, url: string = ''): ScamAnalysisResult {
    const content = (text + ' ' + url).toLowerCase();
    let riskScore = 0;
    const detectedPatterns: string[] = [];

    // Check for scam keywords
    SCAM_KEYWORDS.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        riskScore += 10;
        detectedPatterns.push(`Suspicious keyword: "${keyword}"`);
      }
    });

    // Check for suspicious URLs
    if (url) {
      riskScore += this.analyzeUrl(url, detectedPatterns);
    }

    // Check for urgency patterns
    this.URGENCY_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        riskScore += 8;
        detectedPatterns.push('Urgency pressure tactics detected');
      }
    });

    // Check for money requests
    this.MONEY_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        riskScore += 15;
        detectedPatterns.push('Money transfer request detected');
      }
    });

    // Check for personal information requests
    if (this.containsPersonalInfoRequest(content)) {
      riskScore += 12;
      detectedPatterns.push('Personal information request detected');
    }

    // Check for government/authority impersonation
    if (this.containsAuthorityImpersonation(content)) {
      riskScore += 18;
      detectedPatterns.push('Government/authority impersonation detected');
    }

    return this.calculateRiskLevel(riskScore, detectedPatterns);
  }

  private static analyzeUrl(url: string, detectedPatterns: string[]): number {
    let urlRiskScore = 0;

    // Check for suspicious domains
    SUSPICIOUS_DOMAINS.forEach(domain => {
      if (url.toLowerCase().includes(domain)) {
        urlRiskScore += 15;
        detectedPatterns.push(`Suspicious short URL: ${domain}`);
      }
    });

    // Check for HTTPS
    if (url.startsWith('http://')) {
      urlRiskScore += 5;
      detectedPatterns.push('Non-secure HTTP link');
    }

    // Check for suspicious TLDs
    this.SUSPICIOUS_TLDS.forEach(tld => {
      if (url.includes(tld)) {
        urlRiskScore += 20;
        detectedPatterns.push(`Suspicious domain extension: ${tld}`);
      }
    });

    // Check for IP addresses instead of domain names
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
    if (ipPattern.test(url)) {
      urlRiskScore += 25;
      detectedPatterns.push('IP address used instead of domain name');
    }

    // Check for suspicious subdomains
    const suspiciousSubdomains = ['secure', 'verify', 'update', 'login', 'account'];
    suspiciousSubdomains.forEach(subdomain => {
      if (url.includes(`${subdomain}.`) || url.includes(`${subdomain}-`)) {
        urlRiskScore += 8;
        detectedPatterns.push(`Suspicious subdomain: ${subdomain}`);
      }
    });

    return urlRiskScore;
  }

  private static containsPersonalInfoRequest(content: string): boolean {
    const personalInfoPatterns = [
      /social security/i,
      /aadhar/i,
      /pan card/i,
      /bank account/i,
      /credit card/i,
      /password/i,
      /otp/i,
      /pin/i,
      /date of birth/i,
      /mother.*maiden.*name/i
    ];

    return personalInfoPatterns.some(pattern => pattern.test(content));
  }

  private static containsAuthorityImpersonation(content: string): boolean {
    const authorityPatterns = [
      /government/i,
      /irs/i,
      /income tax/i,
      /police/i,
      /court/i,
      /legal action/i,
      /arrest warrant/i,
      /customs/i,
      /rbi/i,
      /reserve bank/i,
      /sebi/i
    ];

    return authorityPatterns.some(pattern => pattern.test(content));
  }

  private static calculateRiskLevel(riskScore: number, detectedPatterns: string[]): ScamAnalysisResult {
    let riskLevel: RiskLevel = 'Low';
    let riskColor = '#10b981';
    
    if (riskScore >= 30) {
      riskLevel = 'High';
      riskColor = '#ef4444';
    } else if (riskScore >= 15) {
      riskLevel = 'Medium';
      riskColor = '#f59e0b';
    }

    return {
      riskScore: Math.min(riskScore, 100), // Cap at 100
      riskLevel,
      riskColor,
      detectedPatterns: [...new Set(detectedPatterns)], // Remove duplicates
      isScam: riskScore >= 20
    };
  }

  // Additional utility methods
  public static getScamAdvice(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'High':
        return 'This appears to be a scam! Do not click links, send money, or share personal information. Report this immediately.';
      case 'Medium':
        return 'This shows suspicious characteristics. Be very cautious and verify through official channels before taking any action.';
      case 'Low':
        return 'This appears relatively safe, but always stay vigilant with unsolicited messages.';
    }
  }

  public static getReportingAdvice(): string[] {
    return [
      'Screenshot the suspicious message',
      'Report to cybercrime.gov.in',
      'Call 1930 for cyber crime helpline',
      'Block the sender',
      'Do not engage with the scammer'
    ];
  }
}