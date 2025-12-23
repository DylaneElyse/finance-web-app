import Link from "next/link";
import { Settings as SettingsIcon, User, Sliders, ShoppingBag, FolderTree } from "lucide-react";

export default function Settings() {
  const settingsCards = [
    {
      title: "Account Settings",
      description: "Manage your user account, profile, and preferences",
      icon: User,
      href: "#",
      disabled: true,
    },
    {
      title: "Application Settings",
      description: "Configure app behavior, notifications, and defaults",
      icon: Sliders,
      href: "#",
      disabled: true,
    },
    {
      title: "Payee Settings",
      description: "Manage payees and merchants for transactions",
      icon: ShoppingBag,
      href: "/protected/settings/payees",
      disabled: false,
    },
    {
      title: "Category Settings",
      description: "Organize and manage budget categories and subcategories",
      icon: FolderTree,
      href: "/protected/settings/categories",
      disabled: false,
    },
  ];

  return (
    <main className="min-h-screen p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon size={32} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
          </div>
          <p className="text-slate-600">Manage your application settings and preferences</p>
        </div>

        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            const content = (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${card.disabled ? 'bg-slate-100' : 'bg-blue-100'}`}>
                    <Icon size={24} className={card.disabled ? 'text-slate-400' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1">
                    <h2 className={`text-xl font-semibold ${card.disabled ? 'text-slate-400' : 'text-slate-800'}`}>
                      {card.title}
                    </h2>
                  </div>
                </div>
                <p className={`text-sm ${card.disabled ? 'text-slate-400' : 'text-slate-600'}`}>
                  {card.description}
                </p>
                {card.disabled && (
                  <div className="mt-4">
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  </div>
                )}
              </>
            );

            if (card.disabled) {
              return (
                <div
                  key={card.title}
                  className="bg-white rounded-lg border border-slate-200 p-6 cursor-not-allowed opacity-60"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={card.title}
                href={card.href}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                {content}
                <div className="mt-4 text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  Manage →
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
