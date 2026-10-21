export default function CocBrand({ className = "" }: { className?: string }) {
  return <div className={`coc-brand ${className}`}>
    <img src="/brand/coc-psu-color.png" alt="College of Computing, Prince of Songkla University" width={580} height={126} />
    <span>วิทยาลัยการคอมพิวเตอร์ · มหาวิทยาลัยสงขลานครินทร์</span>
  </div>;
}
