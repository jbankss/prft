import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Globe, Edit, Mail, Phone } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export function BrandCard({
  brand,
  onEdit,
  onClick,
}: {
  brand: Brand;
  onEdit: () => void;
  onClick: () => void;
}) {
  return (
    <Card
      className="p-4 glass shadow-apple-md hover:shadow-apple-lg transition-all duration-200 hover:scale-[1.01] cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base font-semibold truncate">{brand.name}</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="transition-all duration-200 hover:scale-110 flex-shrink-0 h-7 w-7 p-0"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>

          {brand.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
              {brand.description}
            </p>
          )}

          <div className="space-y-0.5">
            {brand.website && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="h-3 w-3 flex-shrink-0" />
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-foreground transition-colors truncate"
                >
                  {brand.website}
                </a>
              </div>
            )}
            {brand.contact_email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{brand.contact_email}</span>
              </div>
            )}
            {brand.contact_phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{brand.contact_phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}