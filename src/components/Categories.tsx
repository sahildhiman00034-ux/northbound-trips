import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const Categories = () => {
  const navigate = useNavigate();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/trips?category=${categoryId}`);
  };

  return (
    <div className="py-12">
      <h2 className="mb-8 text-3xl font-bold">Select Trip Category</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {categories?.map((category) => (
          <Card
            key={category.id}
            className="cursor-pointer p-6 text-center transition-all hover:shadow-lg hover:scale-105"
            onClick={() => handleCategoryClick(category.id)}
          >
            <div className="mb-3 text-4xl">{category.icon}</div>
            <h3 className="font-semibold">{category.name}</h3>
          </Card>
        ))}
      </div>
    </div>
  );
};
