"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { StoredIntent } from "@/lib/services/mongodb-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export function IntentHistory() {
  const [intents, setIntents] = useState<StoredIntent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { address } = useAccount();

  useEffect(() => {
    async function fetchIntents() {
      if (!address) {
        setIntents([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/intent/history?userAddress=${address}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch intent history');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setIntents(data.data);
        } else {
          console.error('Error fetching intents:', data.error);
          setIntents([]);
        }
      } catch (error) {
        console.error('Error fetching intent history:', error);
        setIntents([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchIntents();
  }, [address]);

  // Filter active intents (yield-related)
  const activeIntents = intents.filter(intent => 
    intent.type === 'deposit' || 
    intent.type === 'stake' || 
    intent.description.toLowerCase().includes('yield') ||
    intent.description.toLowerCase().includes('earn') ||
    intent.description.toLowerCase().includes('apy')
  );

  // All other intents are considered completed
  const completedIntents = intents.filter(intent => 
    !activeIntents.includes(intent)
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (!address) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Connect your wallet to view your intent history.</p>
      </div>
    );
  }

  if (intents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No intents found. Create your first intent to get started.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="bg-gray-800/50 mb-6 rounded-xl p-1 gap-2 border border-gray-700">
        <TabsTrigger
          value="all"
          className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
        >
          All Intents
        </TabsTrigger>
        <TabsTrigger
          value="active"
          className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
        >
          Active Intents
        </TabsTrigger>
        <TabsTrigger
          value="completed"
          className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
        >
          Completed Intents
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <div className="space-y-4">
          {intents.map((intent, index) => (
            <IntentCard key={index} intent={intent} />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="active">
        {activeIntents.length > 0 ? (
          <div className="space-y-4">
            {activeIntents.map((intent, index) => (
              <IntentCard key={index} intent={intent} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No active intents found.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="completed">
        {completedIntents.length > 0 ? (
          <div className="space-y-4">
            {completedIntents.map((intent, index) => (
              <IntentCard key={index} intent={intent} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No completed intents found.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function IntentCard({ intent }: { intent: StoredIntent }) {
  // Format the date
  const formattedDate = intent.createdAt 
    ? formatDistanceToNow(new Date(intent.createdAt), { addSuffix: true })
    : 'Unknown date';

  // Get badge color based on intent type
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'stake':
        return 'bg-green-900/50 text-green-400 border-green-800';
      case 'withdraw':
      case 'unstake':
        return 'bg-red-900/50 text-red-400 border-red-800';
      case 'swap':
        return 'bg-blue-900/50 text-blue-400 border-blue-800';
      case 'borrow':
        return 'bg-purple-900/50 text-purple-400 border-purple-800';
      case 'repay':
        return 'bg-indigo-900/50 text-indigo-400 border-indigo-800';
      case 'transfer':
        return 'bg-yellow-900/50 text-yellow-400 border-yellow-800';
      default:
        return 'bg-gray-800/50 text-gray-400 border-gray-700';
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-4 hover:border-gray-700 transition-all duration-300">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className={`text-xs px-2 py-1 rounded-full border ${getBadgeColor(intent.type)}`}>
            {intent.type.charAt(0).toUpperCase() + intent.type.slice(1)}
          </span>
          <span className="text-xs text-gray-500 ml-2">{formattedDate}</span>
        </div>
        <span className="text-xs text-gray-500">{intent.chain}</span>
      </div>
      
      <p className="text-gray-300 text-lg mb-3">"{intent.description}"</p>
      
      {intent.steps && intent.steps.length > 0 && (
        <div className="mt-2">
          <details className="group">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 flex items-center">
              <span>View execution steps</span>
              <svg 
                className="ml-1 w-4 h-4 transition-transform group-open:rotate-180" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-2 pl-4 border-l border-gray-800">
              <ol className="space-y-2">
                {intent.steps.map((step, i) => (
                  <li key={i} className="text-sm text-gray-400">
                    <span className="text-gray-500">{i + 1}.</span> {step.description}
                    {step.transactionHash && (
                      <div className="mt-1 text-xs">
                        <a
                          href={
                            step.chain === "celoAlfajores"
                              ? `https://alfajores.celoscan.io/tx/${step.transactionHash}`
                              : step.chain === "rootstock"
                              ? `https://explorer.testnet.rootstock.io/tx/${step.transactionHash}`
                              : `#`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          View transaction
                        </a>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/30 p-4">
          <div className="flex justify-between items-start mb-3">
            <Skeleton className="h-6 w-20 bg-gray-800" />
            <Skeleton className="h-4 w-16 bg-gray-800" />
          </div>
          <Skeleton className="h-6 w-full bg-gray-800 mb-2" />
          <Skeleton className="h-6 w-3/4 bg-gray-800 mb-4" />
          <Skeleton className="h-4 w-32 bg-gray-800" />
        </div>
      ))}
    </div>
  );
}
